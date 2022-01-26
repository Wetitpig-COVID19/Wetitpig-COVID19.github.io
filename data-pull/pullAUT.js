const axios = require('axios');
const fs = require('fs');
const tools = require('./tools');

(async () => {
	const dateRegex = new RegExp(/(\d{2})\.(\d{2})\.(\d{4})/);
	const URL = [
		'https://covid19-dashboard.ages.at/data/CovidFaelle_Timeline_GKZ.csv',
		'https://info.gesundheitsministerium.gv.at/data/COVID19_vaccination_doses_timeline.csv',
		'https://info.gesundheitsministerium.gv.at/data/COVID19_vaccination_municipalities.csv'
	];
	var lastModified = await Promise.all(
		URL.map(async url => {
			var d = await axios.head(url);
			d = new Date(d.headers['last-modified']);
			d.setUTCHours(0,0,0);
			return d;
		})
	);

	var currentData;
	try {
		currentData = JSON.parse(fs.readFileSync('assets/data/AUT.json'));
	} catch (e) {
		currentData = {lastModified: new Array(3).fill("1970-01-01")};
	}

	if (lastModified.some((lu, index) => tools.convertDate(currentData.lastModified[index]).getTime() - lu.getTime())) {
		tools.msg.log('New data is available!');
		var Bezirke = new Array(94).fill(null).map(() => ({}));

		const casesPromise = async () => {
			tools.msg.info('Pulling cases data...');
			var response = await axios.get(URL[0], {
				headers: {
					'Accept-Encoding': 'gzip, compress, deflate'
				}
			});
			var workbook = await tools.csvParse(response.data);
			workbook.sort((a,b) => a.GKZ != b.GKZ ? a.GKZ - b.GKZ : tools.convertDate(b.Time, dateRegex, true).getTime() - tools.convertDate(a.Time, dateRegex, true).getTime());
			numberOfDays = workbook.length / 94;
			Bezirke.forEach((bez, index) => {
				Object.assign(bez, {
					lastUpdate: {
						cases: tools.convertDate(workbook[index * numberOfDays].Time, dateRegex, true).toISOString().slice(0,10)
					},
					GKZ: workbook[index * numberOfDays].GKZ,
					EWZ: workbook[index * numberOfDays].AnzEinwohner
				});
				[7,14,28].forEach(j => {
					bez['cases' + j.toString(10)] = workbook[index * numberOfDays].AnzahlFaelleSum - workbook[index * numberOfDays + j].AnzahlFaelleSum;
					bez['deaths' + j.toString(10)] = workbook[index * numberOfDays].AnzahlTotSum - workbook[index * numberOfDays + j].AnzahlTotSum;
				});
			});
		};

		var bundeslaender = ['Burgenland','Kärnten','Niederösterreich','Oberösterreich','Salzburg','Steiermark','Tirol','Voralberg','Wien'].map(name => ({
			cases7: 0, cases14: 0, cases28: 0,
			deaths7: 0, deaths14: 0, deaths28: 0,
			EWZ: 0, lastUpdate: {cases: null}, BL: name
		}));
		var Bund = {lastUpdate: {}};
		const vaccineTimelinePromise = async () => {
			tools.msg.info('Pulling vaccine data...');
			response = await axios.get(URL[1], {
				headers: {
					'Accept-Encoding': 'gzip, compress, deflate'
				}
			});
			workbook = await tools.csvParse(response.data);
			workbook.sort((item1, item2) => item1.state_id != item2.state_id ? item1.state_id - item2.state_id : item2.date.getTime() - item1.date.getTime());
			var numberOfDays = workbook.length / 11;

			const extractData = (obj, index) => {
				[2,3].forEach(s => ['','_90','_180'].forEach(t =>
					obj['dose' + s.toString(10) + t] = workbook.filter(
						value => value.state_id == index + 1 && value.date.getTime() == workbook[(index + 1) * numberOfDays].date.getTime() && value.dose_number == s
					).reduce((aggregate, row) => aggregate + row.doses_administered_cumulative, 0)
				));
				[2,3].forEach(s => [90,180].forEach(t =>
					obj[`dose${s.toString(10)}_${t.toString(10)}`] -= workbook.filter(value => {
						dateDifference = [value.date, workbook[(index + 1) * numberOfDays].date];
						dateDifference.forEach(v => v.setHours(0,0,0));
						return value.state_id == index + 1 && dateDifference[1].getTime() - dateDifference[0].getTime() == t * 86_400_000 && value.dose_number == s
					}).reduce((aggregate, row) => aggregate + row.doses_administered_cumulative, 0)
				));
				obj.lastUpdate.vac = workbook[(index + 1) * numberOfDays].date.toISOString().slice(0,10);
			};

			bundeslaender.forEach(extractData);
			extractData(Bund, 9);
		};
		const vaccineBezirkPromise = async () => {
			response = await axios.get(URL[2], {
				headers: {
					'Accept-Encoding': 'gzip, compress, deflate'
				}
			});
			workbook = await tools.csvParse(response.data);
			Bezirke.forEach(bez => {
				toProcess = workbook.filter(value => value.municipality_id >= 900 ? Math.floor(value.municipality_id / 100) == bez.GKZ : Math.floor(bez.GKZ / 10000) == 9);
				['2','3'].forEach(t => bez['dose' + t] = toProcess.reduce((aggregate, dose) => aggregate + dose['dose_' + t], 0));
				bez.lastUpdate.vac = toProcess.reduce((aggregate, dose) => new Date(Math.max(aggregate.getTime(), dose.date.getTime())), new Date(0)).toISOString().slice(0,10);
			});
		};

		await casesPromise();
		await Promise.all([vaccineTimelinePromise(),vaccineBezirkPromise()]);

		tools.msg.info('Grouping...');
		Bezirke.forEach(bez => {
			['cases','deaths'].forEach(c => ['7', '14', '28'].forEach(t => bundeslaender[Math.floor(parseInt(bez.GKZ, 10) / 100) - 1][c + t] += bez[c + t]));
			bundeslaender[Math.floor(parseInt(bez.GKZ, 10) / 100) - 1].EWZ += bez.EWZ;
			bundeslaender[Math.floor(parseInt(bez.GKZ, 10) / 100) - 1].lastUpdate.cases = bundeslaender[Math.floor(parseInt(bez.GKZ, 10) / 100) - 1].lastUpdate.cases > bez.lastUpdate.cases ? bundeslaender[Math.floor(parseInt(bez.GKZ, 10) / 100) - 1].lastUpdate.cases : bez.lastUpdate.cases;
		});
		['cases','deaths'].forEach(c => ['7', '14', '28'].forEach(t => Bund[c + t] = bundeslaender.reduce((aggregate, bl) => aggregate + bl[c + t], 0)));
		Bund.EWZ = bundeslaender.reduce((aggregate, bl) => aggregate += bl.EWZ, 0);
		Bund.lastUpdate.cases = bundeslaender.reduce((aggregate, bl) => aggregate > bl.lastUpdate.cases ? aggregate : bl.lastUpdate.cases, null);

		fs.writeFileSync('assets/data/AUT.json', JSON.stringify({
			NUTS3: Bezirke,
			NUTS2: bundeslaender,
			NUTS1: Bund,
			lastModified: lastModified.map(lu => lu.toISOString().slice(0,10))
		}));
	}
	else
		tools.msg.log('Nothing to change!');
	tools.msg.log('Done!');
})();
