const axios = require('axios');
const fs = require('fs');
const tools = require('./tools');

(async () => {
	const URL = [
		'https://www.data.gouv.fr/fr/datasets/r/406c6a23-e283-4300-9484-54e78c8ae675',
		'https://www.data.gouv.fr/fr/datasets/r/6fadff46-9efd-4c53-942a-54aca783c30c',
		'https://www.data.gouv.fr/fr/datasets/r/4f39ec91-80d7-4602-befb-4b522804c0af'
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
		currentData = JSON.parse(fs.readFileSync('assets/data/FRA.json'));
	} catch (e) {
		currentData = {lastModified: new Array(3).fill("1970-01-01")};
	}

	if (lastModified.some((lu, index) => tools.convertDate(currentData.lastModified[index]).getTime() - lu.getTime())) {
		tools.msg.log('New data is available!');
		var Departements = new Array(96).fill(null).map(() => ({
			lastUpdate: {}
		}));

		tools.msg.info('Pulling deaths data...');
		const deathsPromise = async () => {
			var response = await axios.get(URL[1], {
				headers: {
					'Accept-Encoding': 'gzip, compress, deflate'
				}
			});
			var workbook = await tools.csvParse(response.data);
			workbook = workbook.filter(value => isNaN(value.dep) || value.dep < 100);
			workbook.sort((a,b) => a.dep != b.dep ? parseInt((isNaN(a.dep) ? a.dep : a.dep.toString(10)), 16) - parseInt((isNaN(b.dep) ? b.dep : b.dep.toString(10)), 16) : b.jour < a.jour ? -1 : 1);
			numberOfDays = workbook.length / 96;
			Departements.forEach((dept, index) => {
				dept.lastUpdate.deaths = tools.convertDate(workbook[index * numberOfDays].jour).toISOString().slice(0,10);
				[7,14,28].forEach(j => dept['deaths' + j.toString(10)] = workbook.slice(index * numberOfDays, index * numberOfDays + j).reduce((a,b) => a + b.incid_dc, 0));
				dept.dep = typeof(workbook[index * numberOfDays].dep) === 'number' ? workbook[index * numberOfDays].dep.toString(10).padStart(2,'0') : workbook[index * numberOfDays].dep;
			});
		};

		const casesPromise = async () => {
			tools.msg.info('Pulling cases data...');
			var response = await axios.get(URL[0], {
				headers: {
					'Accept-Encoding': 'gzip, compress, deflate'
				}
			});
			var workbook = await tools.csvParse(response.data);
			workbook = workbook.filter(value => (isNaN(value.dep) || value.dep < 100) && value.cl_age90 == 0);
			workbook.sort((a,b) => a.dep != b.dep ? parseInt((isNaN(a.dep) ? a.dep : a.dep.toString(10)), 16) - parseInt((isNaN(b.dep) ? b.dep : b.dep.toString(10)), 16) : b.jour < a.jour ? -1 : 1);
			numberOfDays = workbook.length / 96;
			Departements.forEach((dept, index) => {
				dept.lastUpdate.cases = tools.convertDate(workbook[index * numberOfDays].jour).toISOString().slice(0,10);
				[7,14,28].forEach(j => dept['cases' + j.toString(10)] = workbook.slice(index * numberOfDays, index * numberOfDays + j).reduce((a,b) => a + b.P, 0));
				dept.EWZ = workbook[index * numberOfDays].pop;
			});
		};

		const vaccinePromise = async () => {
			tools.msg.info('Pulling vaccine data...');
			var response = await axios.get(URL[2], {
				headers: {
					'Accept-Encoding': 'gzip, compress, deflate'
				}
			});
			var workbook = await tools.csvParse(response.data);
			workbook = workbook.filter(value => isNaN(value.dep) || value.dep < 100);
			workbook.sort((a,b) => a.dep != b.dep ? parseInt((isNaN(a.dep) ? a.dep : a.dep.toString(10)), 16) - parseInt((isNaN(b.dep) ? b.dep : b.dep.toString(10)), 16) : b.jour < a.jour ? -1 : 1);
			numberOfDays = workbook.length / 96;
			Departements.forEach((dept, index) => {
				dept.lastUpdate.vac = tools.convertDate(workbook[index * numberOfDays].jour).toISOString().slice(0,10);
				dept.dose2 = workbook[index * numberOfDays].n_cum_complet;
				dept.dose3 = workbook[index * numberOfDays].n_cum_rappel;
				[90, 180].forEach(t => {
					dept['dose2_' + t.toString(10)] = dept.dose2 - workbook[index * numberOfDays + t].n_cum_complet;
					dept['dose3_' + t.toString(10)] = dept.dose3 - workbook[index * numberOfDays + t].n_cum_rappel;
				});
			});
		};

		await Promise.all([deathsPromise(),casesPromise(),vaccinePromise()]);

		tools.msg.info('Grouping...');
		const regCode = ["84","32","84","93","93","93","84","44","76","44","76","76","93","28","84","75","75","24","75","27","53","75","75","27","84","28","24","53","94","94","76","76","76","75","76","53","24","24","84","27","75","24","84","84","52","24","76","75","76","52","28","44","44","52","44","44","53","44","27","32","32","28","32","84","75","76","76","44","44","84","27","27","52","84","84","11","28","11","11","75","32","76","76","93","93","52","75","75","44","27","27","11","11","11","11","11"];
		var Regions = {};
		regCode.forEach(c => Regions[c] = {
			cases7: 0, cases14: 0, cases28: 0,
			deaths7: 0, deaths14: 0, deaths28: 0,
			dose2_90: 0, dose2_180: 0, dose2: 0,
			dose3_90: 0, dose3_180: 0, dose3: 0,
			EWZ: 0, lastUpdate: {
				cases: null, deaths: null, vac: null
			}
		});
		regCode.forEach((c,i) => {
			Object.keys(Departements[i]).filter(value => value != 'dep' && value.indexOf('lastUpdate') === -1).forEach(k => Regions[c][k] += Departements[i][k]);
			['cases','deaths','vac'].forEach(s => Regions[c].lastUpdate[s] = Regions[c].lastUpdate[s] > Departements[i].lastUpdate[s] ? Regions[c].lastUpdate[s] : Departements[i].lastUpdate[s]);
		});

		var Republique = Object.values(Regions).reduce((aggregate, R) => {
			Object.keys(R).filter(value => value.indexOf('lastUpdate') === -1).forEach(k => aggregate[k] += R[k]);
			['cases','deaths','vac'].forEach(s => aggregate.lastUpdate[s] = aggregate.lastUpdate[s] > R.lastUpdate[s] ? aggregate.lastUpdate[s] : R.lastUpdate[s]);
			return aggregate;
		}, {
			cases7: 0, cases14: 0, cases28: 0,
			deaths7: 0, deaths14: 0, deaths28: 0,
			dose2_90: 0, dose2_180: 0, dose2: 0,
			dose3_90: 0, dose3_180: 0, dose3: 0,
			EWZ: 0, lastUpdate: {
				cases: null, deaths: null, vac: null
			}
		});

		var result = {
			NUTS3: Departements,
			NUTS2: Regions,
			NUTS1: Republique,
			lastModified: lastModified.map(lu => lu.toISOString().slice(0,10))
		};
		fs.writeFileSync('assets/data/FRA.json', JSON.stringify(result));
	}
	else
		tools.msg.log('Nothing to change!');
	tools.msg.log('Done!');
})();
