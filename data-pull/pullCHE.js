const axios = require('axios');
const fs = require('fs');
const tools = require('./tools');

(async () => {

	var urlData = (await axios.get('https://www.covid19.admin.ch/api/data/context')).data;
	lastModified = tools.convertDate(urlData.sourceDate);

	var currentData;
	try {
		currentData = JSON.parse(fs.readFileSync('assets/data/CHE.json'));
	} catch (e) {
		currentData = {lastModified: "1970-01-01"};
	}

	if (tools.convertDate(currentData.lastModified).getTime() - lastModified.getTime()) {
		tools.msg.log('New data is available!');
		const caseColumns = {
			geoRegion: 'string',
			pop: 'number',
			datum: 'date',
			sumTotal_last7d: 'number',
			sumTotal_last14d: 'number',
			sumTotal_last28d: 'number',
			timeframe_7d: 'boolean'
		};

		tools.msg.info('Pulling deaths data...');
		var Bund = {};

		var workbook = await tools.csvPull(urlData.sources.individual.csv.daily.death, caseColumns);

		var reducedWorkbook = [];
		workbook.forEach((row, index, array) => {
			if (row.timeframe_7d && !array[index + 1].timeframe_7d && row.geoRegion != "CHFL") {
				if (row.geoRegion == "CH") {
					['7','14','28'].forEach(s => Bund['deaths' + s] = row[`sumTotal_last${s}d`]);
					Bund.EWZ = row.pop;
					Bund.lastUpdate = {
						deaths: row.datum.toISOString().slice(0,10)
					};
				}
				else
					reducedWorkbook.push(row);
			}
		});
		reducedWorkbook.sort((item1, item2) => item1.geoRegion < item2.geoRegion ? -1 : 1);

		var Kantone = reducedWorkbook.map(feature => {
			var f = {};
			f.KTCODE = feature.geoRegion;
			['7', '14', '28'].forEach(s => f['deaths' + s] = feature[`sumTotal_last${s}d`]);
			f.EWZ = feature.pop;
			f.lastUpdate = {
				deaths: feature.datum.toISOString().slice(0,10)
			};
			return f;
		});
		tools.validate.deaths([...Kantone, Bund]);

		tools.msg.info('Pulling cases data...');
		const casesPromise = async () => {
			var workbook = await tools.csvPull(urlData.sources.individual.csv.daily.cases, caseColumns);

			reducedWorkbook = [];
			workbook.forEach((row, index, self) => {
				if (row.timeframe_7d && !self[index + 1].timeframe_7d && row.geoRegion != "CHFL") {
					if (row.geoRegion == "CH") {
						['7','14','28'].forEach(s => Bund['cases' + s] = row[`sumTotal_last${s}d`]);
						Bund.EWZ = row.pop;
						Bund.lastUpdate.cases = row.datum.toISOString().slice(0,10);
					}
					else
						reducedWorkbook.push(row);
				}
			});

			reducedWorkbook.sort((item1, item2) => item1.geoRegion < item2.geoRegion ? -1 : 1);
			reducedWorkbook.forEach((row, index) => {
				['7','14','28'].forEach(s => Kantone[index]['cases' + s] = row[`sumTotal_last${s}d`]);
				Kantone[index].lastUpdate.cases = row.datum.toISOString().slice(0,10);
			});
			tools.validate.cases([...Kantone, Bund]);
		};

		tools.msg.info('Pulling vaccine data...');
		const vaccinePromise = async () => {
			var workbook = await tools.csvPull(urlData.sources.individual.csv.vaccPersonsV2, {
				age_group: 'string',
				geoRegion: 'string',
				type: 'string',
				date: 'date',
				sumTotal: 'number'
			});
			workbook = workbook.filter(value => value.age_group == 'total_population' && value.geoRegion != 'CHFL');

			[
				workbook.filter(value => value.type == 'COVID19FullyVaccPersons'),
				workbook.filter(value => value.type == 'COVID19FirstBoosterPersons')
			].forEach((wb, i) => {
				Kantone.forEach(kt => {
					toProcess = wb.filter(value => value.geoRegion == kt.KTCODE).sort((item1, item2) => item1.date > item2.date ? -1 : 1);
					kt.lastUpdate.vac = toProcess[0].date.toISOString().slice(0,10);
					['','_90','_180'].forEach(t => kt['dose' + (2 + i).toString(10) + t] = toProcess[0].sumTotal);
					[90,180].forEach(t => kt[`dose${(2 + i).toString(10)}_${t.toString(10)}`] -= toProcess[t].sumTotal);
				});
				toProcess = wb.filter(value => value.geoRegion == 'CH').sort((item1, item2) => item1.date > item2.date ? -1 : 1);
				['','_90','_180'].forEach(t => Bund['dose' + (2 + i).toString(10) + t] = toProcess[0].sumTotal);
				[90,180].forEach(t => Bund[`dose${(2 + i).toString(10)}_${t.toString(10)}`] -= toProcess[t].sumTotal);
				Bund.lastUpdate.vac = toProcess[0].date.toISOString().slice(0,10);
			});
			tools.validate.vaccine([...Kantone, Bund]);
		};

		await Promise.all([casesPromise(),vaccinePromise()]);

		tools.msg.info('Grouping...');
		var GrossRegionen = ['Région lémanique','Espace Mittelland','Nordwestschweiz','Zürich','Ostschweiz/Svizzera orientale','Zentralschweiz','Ticino'].map(name => Object.assign({
			EWZ: 0, name: name, lastUpdate: {
				cases: null, deaths: null, vac: null
			}
		}, ...Object.values(tools.baseJSON)));
		[2,4,4,1,2,2,null,1,0,4,4,1,5,1,5,5,4,4,1,5,4,6,5,0,0,5,3].forEach((GRNR, index) => {
			if (GRNR != null) {
				Object.keys(Kantone[index]).filter(value => value != 'KTCODE' && value.indexOf('lastUpdate') === -1).forEach(k => GrossRegionen[GRNR][k] += Kantone[index][k]);
				['cases','deaths','vac'].forEach(s => GrossRegionen[GRNR].lastUpdate[s] = GrossRegionen[GRNR].lastUpdate[s] > Kantone[index].lastUpdate[s] ? GrossRegionen[GRNR].lastUpdate[s] : Kantone[index].lastUpdate[s]);
			}
		});

		fs.writeFileSync('assets/data/CHE.json', JSON.stringify({
			NUTS3: Kantone,
			NUTS2: GrossRegionen,
			NUTS1: Bund,
			lastModified: lastModified.toISOString().slice(0,10)
		}));
	}
	else
		tools.msg.log('Nothing to change!');
	tools.msg.log('Done!');
})();
