const axios = require('axios');
const fs = require('fs');
const tools = require('./tools');
const process = require('process');

(async () => {
	var response = (await axios.get('https://services7.arcgis.com/mOBPykOjAyBO2ZKk/arcgis/rest/services/rki_data_status_v/FeatureServer/0/query', {
		params: {
			where: '1=1',
			outFields: 'Datum',
			f: 'json'
		}
	})).data;
	var casesLastUpdate = new Date(response.features[0].attributes.Datum);
	casesLastUpdate.setTime(casesLastUpdate.getTime() - 23 * 60 * 60 * 1000);

	const ImpfURL = 'https://raw.githubusercontent.com/robert-koch-institut/COVID-19-Impfungen_in_Deutschland/master/Aktuell_Deutschland_Landkreise_COVID-19-Impfungen.csv';
	var etag = (await axios.head(ImpfURL)).headers.etag;

	var currentData;
	try {
		currentData = JSON.parse(fs.readFileSync('assets/data/DEU.json'));
	} catch (e) {
		currentData = {lastUpdate:{cases: "1970-01-01"}, etag: null};
	}

	if (tools.convertDate(currentData.lastUpdate.cases).getTime() - casesLastUpdate.getTime() || etag != currentData.etag) {
		tools.msg.log('New data is available!');

		tools.msg.info('Pulling population data...');
		response = (await axios.get('https://services7.arcgis.com/mOBPykOjAyBO2ZKk/arcgis/rest/services/RKI_Landkreisdaten/FeatureServer/0/query', {
			params: {
				where: '1=1',
				orderByFields: 'RS ASC',
				outFields: 'RS,EWZ',
				returnGeometry: false,
				f: 'json'
			}
		})).data;
		var Landkreise = response.features.map(feature => feature.attributes);
		Landkreise.push({
			RS: "11000",
			EWZ: Landkreise.filter(value => value.RS.slice(0,2) == '11').reduce((a,b) => a + b.EWZ, 0)
		});

		tools.msg.info('Pulling cases data...');
		const casesPromises = Promise.all([7, 14, 28].map(async t => {
			daysFromNow = [
				new Date(casesLastUpdate.getTime() - (t - 1) * 86400000),
				new Date(casesLastUpdate.getTime())
			];
			response = (await axios.get('https://services7.arcgis.com/mOBPykOjAyBO2ZKk/arcgis/rest/services/RKI_COVID19/FeatureServer/0/query', {
				params: {
					where: `(Meldedatum BETWEEN DATE \'${daysFromNow[0].toISOString().slice(0,10)}\' AND DATE \'${daysFromNow[1].toISOString().slice(0,10)}\')`,
					orderByFields: 'IdLandkreis ASC',
					groupByFieldsForStatistics: 'IdLandkreis',
					outStatistics: JSON.stringify([
						{
							statisticType: 'sum',
							onStatisticField: 'AnzahlFall',
							outStatisticFieldName: 'AnzahlFall_S'
						},
						{
							statisticType: 'sum',
							onStatisticField: 'AnzahlTodesfall',
							outStatisticFieldName: 'AnzahlTodesfall_S'
						}
					]),
					f: 'json'
				}
			})).data;
			for (var i = 0; i < response.features.length; i++) {
				Landkreise[i]['cases' + t.toString(10)] = response.features[i].attributes.AnzahlFall_S;
				Landkreise[i]['deaths' + t.toString(10)] = response.features[i].attributes.AnzahlTodesfall_S;
			}
		}));

		tools.msg.info('Pulling vaccine data...');
		Landkreise.sort((item1, item2) => parseInt(item1.RS, 10) - parseInt(item2.RS, 10));
		landkreisFiltered = Landkreise.filter(value => value.RS.slice(0,2) != '11' || value.RS == '11000');
		var bundVacData = {
			dose2_90: 0, dose2_180: 0, dose2: 0,
			dose3_90: 0, dose3_180: 0, dose3: 0
		};

		Landkreise.forEach(x => Object.assign(x, {
			dose2_90: 0, dose2_180: 0, dose2: 0,
			dose3_90: 0, dose3_180: 0, dose3: 0
		}));
		response = (await axios.get(ImpfURL, {
			headers: {
				'Accept-Encoding': 'gzip, compress, deflate'
			}
		})).data;
		var workbook = await tools.csvParse(response);
		landkreisIndex = 0;
		vaccineIndex = 1;
		workbook.sort((item1, item2) => {
			if (item1.LandkreisId_Impfort == 'u') return 1;
			else if (item2.LandkreisId_Impfort == 'u') return -1;
			else if (item1.LandkreisId_Impfort < item2.LandkreisId_Impfort) return -1;
			else if (item1.LandkreisId_Impfort > item2.LandkreisId_Impfort) return 1;
			else return item2.Impfdatum < item1.Impfdatum ? -1 : 1;
		});
		workbook = workbook.filter(value => value.Impfschutz != 1);
		vacLastUpdate = tools.convertDate(workbook.slice(-1)[0].Impfdatum);
		workbook.forEach(row => {
			key = 'dose' + row.Impfschutz.toString(10);
			switch (row.LandkreisId_Impfort)
			{
				case 16056:
					[90, 180].forEach(t => {
						if ((vacLastUpdate.getTime() - tools.convertDate(row.Impfdatum).getTime()) < 86400000 * t)
							landkreisFiltered[385][key + '_' + t.toString(10)] += row.Anzahl;
					});
					landkreisFiltered[385][key] += row.Anzahl;
					break;
				case 17000:
				case 'u':
					[90, 180].forEach(t => {
						if ((vacLastUpdate.getTime() - tools.convertDate(row.Impfdatum).getTime()) < 86400000 * t)
							bundVacData[key + '_' + t.toString(10)] += row.Anzahl;
					});
					bundVacData[key] += row.Anzahl;
					break;
				default:
					if (row.LandkreisId_Impfort != parseInt(landkreisFiltered[landkreisIndex].RS, 10))
						landkreisIndex++;
					[90, 180].forEach(t => {
						if ((vacLastUpdate.getTime() - tools.convertDate(row.Impfdatum).getTime()) < 86400000 * t)
							landkreisFiltered[landkreisIndex][key + '_' + t.toString(10)] += row.Anzahl;
					});
					landkreisFiltered[landkreisIndex][key] += row.Anzahl;
					break;
			}
		});

		await casesPromises;

		tools.msg.info('Grouping...');
		var Bundeslaender = new Array(16).fill(null).map(() => ({
			cases7: 0, cases14: 0, cases28: 0,
			deaths7: 0, deaths14: 0, deaths28: 0,
			dose2_90: 0, dose2_180: 0, dose2: 0,
			dose3_90: 0, dose3_180: 0, dose3: 0,
			EWZ: 0
		}));
		Landkreise.forEach(Landkreis => Object.keys(Landkreis).filter(value => value != 'RS').forEach(k => Bundeslaender[parseInt(Landkreis.RS.substr(0,2), 10) - 1][k] += Landkreis[k]));

		var Bund = Bundeslaender.reduce((aggregate, BL) => {
			Object.keys(BL).forEach(k => aggregate[k] += BL[k]);
			return aggregate;
		}, {
			cases7: 0, cases14: 0, cases28: 0,
			deaths7: 0, deaths14: 0, deaths28: 0,
			dose2_90: 0, dose2_180: 0, dose2: 0,
			dose3_90: 0, dose3_180: 0, dose3: 0,
			EWZ: 0
		});
		Object.keys(bundVacData).forEach(k => Bund[k] += bundVacData[k]);

		var result = {
			NUTS3: Landkreise,
			NUTS2: Bundeslaender,
			NUTS1: Bund,
			lastUpdate: {
				cases: casesLastUpdate.toISOString().slice(0,10),
				vac: vacLastUpdate.toISOString().slice(0,10)
			},
			etag: etag
		};
		fs.writeFileSync('assets/data/DEU.json', JSON.stringify(result));
	}
	else
		tools.msg.log('Nothing to change!');
	tools.msg.log('Done!');
})();
