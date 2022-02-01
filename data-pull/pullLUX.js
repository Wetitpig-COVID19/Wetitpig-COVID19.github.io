const XLSX = require('xlsx');
const fs = require('fs');
const tools = require('./tools');
const { default: axios } = require('axios');

(async () => {
	const URL = [
		'https://data.public.lu/fr/datasets/r/f8d45130-3438-46d8-ae1c-ea40f6c95bff',
		'https://data.public.lu/en/datasets/r/0699455e-03fd-497b-9898-776c6dc786e8'
	];
	var lastModified = await Promise.all(
		URL.map(async url => tools.convertDate((await axios.head(url, {
			maxRedirects: 0,
			validateStatus: status => {
				return status >= 200 && status < 400
			}
		})).headers.location, new RegExp(/(\d{4})(\d{2})(\d{2})-\d{6}/)))
	);

	var currentData;
	try {
		currentData = JSON.parse(fs.readFileSync('assets/data/LUX.json'));
	} catch (e) {
		currentData = {lastModified: new Array(2).fill("1970-01-01")};
	}

	if (lastModified.some((lu, index) => tools.convertDate(currentData.lastModified[index]).getTime() - lu.getTime())) {
		tools.msg.log('New data is available!');
		var result = {
			lastUpdate: {}
		};

		const casesPromise = async () => {
			tools.msg.info('Pulling cases data...');
			var response = await axios.get(URL[0], {
				headers: tools.compressHeaders,
				responseType: 'arraybuffer'
			});
			var workbook = XLSX.read(response.data, {
				type: 'array'
			});
			var processedXLSX = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
				header: 1
			});

			[7, 14, 28].forEach(t => {
				result['cases' + t.toString(10)] = parseInt(processedXLSX.slice(-1)[0][6], 10) - parseInt(processedXLSX.slice(-(t + 1))[0][6], 10);
				result['deaths' + t.toString(10)] = parseInt(processedXLSX.slice(-1)[0][4], 10) - parseInt(processedXLSX.slice(-(t + 1))[0][4], 10);
			});
			result.lastUpdate.cases = tools.convertDate(processedXLSX.slice(-1)[0][0], new RegExp(/^(\d{2})\/(\d{2})\/(\d{4})/), true).toISOString().slice(0,10);
			tools.validate.cases([result]);
			tools.validate.deaths([result]);
		};

		const vaccinePromise = async () => {
			tools.msg.info('Pulling vaccine data...');
			var response = await axios.get(URL[1], {
				headers: tools.compressHeaders,
				responseType: 'arraybuffer'
			});
			var workbook = XLSX.read(response.data, {
				type: 'array'
			});
			var processedXLSX = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
				header: 1,
				raw: false
			});

			result.lastUpdate.vac = tools.convertDate(processedXLSX.slice(-1)[0][0]).toISOString().slice(0,10);
			[90,180].forEach(x => [2, 3].forEach(t => result['dose' + t.toString(10) + '_' + x.toString(10)] = processedXLSX.slice(-x).reduce((a,b) => a + parseInt(b[t], 10), 0)));
			[2,3].forEach(t => result['dose' + t.toString(10)] = processedXLSX.slice(1).reduce((a,b) => a + parseInt(b[t], 10), 0));
			tools.validate.vaccine([result]);
		};

		await Promise.all([casesPromise(),vaccinePromise()]);
		result.lastModified = lastModified.map(lu => lu.toISOString().slice(0,10));
		fs.writeFileSync('assets/data/LUX.json', JSON.stringify(result));
	}
	else
		tools.msg.log('Nothing to change!')
	tools.msg.log('Done!');
})();
