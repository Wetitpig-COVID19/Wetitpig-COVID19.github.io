const axios = require('axios');
const fs = require('fs');
const tools = require('./tools');

(async () => {


	const URL = [
		'https://media.githubusercontent.com/media/robert-koch-institut/SARS-CoV-2_Infektionen_in_Deutschland/master/Aktuell_Deutschland_SarsCov2_Infektionen.csv',
		'https://raw.githubusercontent.com/robert-koch-institut/COVID-19-Impfungen_in_Deutschland/master/Aktuell_Deutschland_Landkreise_COVID-19-Impfungen.csv'
	];
	var etag = await Promise.all(
		URL.map(async url => (await axios.head(url)).headers.etag)
	);

	var currentData;
	try {
		currentData = JSON.parse(fs.readFileSync('assets/data/DEU.json'));
	} catch (e) {
		currentData = {etag: new Array(2).fill(null)};
	}

	if (etag.some((tag, index) => tag != currentData.etag[index])) {
		tools.msg.log('New data is available!');

		tools.msg.info('Pulling population data...');
		var response = (await axios.get('https://services7.arcgis.com/mOBPykOjAyBO2ZKk/arcgis/rest/services/RKI_Landkreisdaten/FeatureServer/0/query', {
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

		const casesPromise = async () => {
			tools.msg.info('Pulling cases data...');
			var landkreisFiltered = new Array(Landkreise.length - 1).fill(null).map(() => ({
				cases7: 0, cases14: 0, cases28: 0,
				deaths7: 0, deaths14: 0, deaths28: 0
			}));

			var workbook = await tools.csvPull(URL[0], {
				IdLandkreis: 'number',
				Meldedatum: 'date',
				AnzahlFall: 'number',
				AnzahlTodesfall: 'number'
			});
			workbook.sort((item1, item2) => item1.IdLandkreis != item2.IdLandkreis ? item1.IdLandkreis - item2.IdLandkreis : item1.Meldedatum > item2.Meldedatum ? -1 : 1);
			casesLastUpdate = workbook[0].Meldedatum;

			var landkreisIndex = 0;
			var Meldedatum;
			workbook.forEach((row, index, self) => {
				if (index && row.IdLandkreis != self[index - 1].IdLandkreis)
					landkreisIndex++;
				Meldedatum = row.Meldedatum;
				[7,14,28].forEach(t => {
					if ((casesLastUpdate.getTime() - Meldedatum.getTime()) < 86400000 * t) {
						landkreisFiltered[landkreisIndex]['cases' + t.toString(10)] += row.AnzahlFall;
						landkreisFiltered[landkreisIndex]['deaths' + t.toString(10)] += row.AnzahlTodesfall;
					}
				});
			});

			tools.validate.cases(landkreisFiltered.slice(0,-1), false);
			tools.validate.deaths(landkreisFiltered.slice(0,-1), false);
			return landkreisFiltered;
		};

		var bundVacData = Object.assign({}, tools.baseJSON.vaccine);
		const vaccinePromise = async () => {
			tools.msg.info('Pulling vaccine data...');
			var landkreisFiltered = new Array(Landkreise.length - 12).fill(null).map(() => Object.assign({}, tools.baseJSON.vaccine));

			var workbook = await tools.csvPull(URL[1], {
				LandkreisId_Impfort: 'number',
				Impfdatum: 'date',
				Impfschutz: 'number',
				Anzahl: 'number'
			});
			workbook.sort((item1, item2) => {
				if (item1.LandkreisId_Impfort == 'u') return 1;
				else if (item2.LandkreisId_Impfort == 'u') return -1;
				else if (item1.LandkreisId_Impfort == item2.LandkreisId_Impfort) return item2.Impfdatum < item1.Impfdatum ? -1 : 1;
				else return item1.LandkreisId_Impfort - item2.LandkreisId_Impfort;
			});
			workbook = workbook.filter(value => value.Impfschutz != 1);
			vacLastUpdate = workbook.slice(-1)[0].Impfdatum;

			var landkreisIndex = 0;
			workbook.forEach((row, index, self) => {
				key = 'dose' + row.Impfschutz.toString(10);
				switch (row.LandkreisId_Impfort)
				{
					case 16056:
						[90, 180].forEach(t => {
							if ((vacLastUpdate.getTime() - row.Impfdatum.getTime()) < 86400000 * t)
								landkreisFiltered[385][key + '_' + t.toString(10)] += row.Anzahl;
						});
						landkreisFiltered[385][key] += row.Anzahl;
						break;
					case 17000:
					case 'u':
						[90, 180].forEach(t => {
							if ((vacLastUpdate.getTime() - row.Impfdatum.getTime()) < 86400000 * t)
								bundVacData[key + '_' + t.toString(10)] += row.Anzahl;
						});
						bundVacData[key] += row.Anzahl;
						break;
					default:
						if (index && row.LandkreisId_Impfort != self[index - 1].LandkreisId_Impfort)
							landkreisIndex++;
						[90, 180].forEach(t => {
							if ((vacLastUpdate.getTime() - row.Impfdatum.getTime()) < 86400000 * t)
								landkreisFiltered[landkreisIndex][key + '_' + t.toString(10)] += row.Anzahl;
						});
						landkreisFiltered[landkreisIndex][key] += row.Anzahl;
						break;
				}
			});

			tools.validate.vaccine(landkreisFiltered);
			return landkreisFiltered;
		};

		var landkreisFiltered = await Promise.all([casesPromise(),vaccinePromise()]);
		landkreisFiltered[0].forEach((data, index) => Object.assign(Landkreise[index], data));
		Landkreise.sort((item1, item2) => parseInt(item1.RS, 10) - parseInt(item2.RS, 10));
		Landkreise.filter(value => value.RS.slice(0,2) != '11' || value.RS == '11000').forEach((Lv, index) => Object.assign(Lv, landkreisFiltered[1][index]));

		tools.msg.info('Grouping...');
		var Bundeslaender = new Array(16).fill(null).map(() => Object.assign({ EWZ: 0 }, ...Object.values(tools.baseJSON)));
		Landkreise.forEach(Landkreis => Object.keys(Landkreis).filter(value => value != 'RS').forEach(k => Bundeslaender[parseInt(Landkreis.RS.substr(0,2), 10) - 1][k] += Landkreis[k]));

		var Bund = Bundeslaender.reduce((aggregate, BL) => {
			Object.keys(BL).forEach(k => aggregate[k] += BL[k]);
			return aggregate;
		}, Object.assign({ EWZ: 0 }, ...Object.values(tools.baseJSON)));
		Object.keys(bundVacData).forEach(k => Bund[k] += bundVacData[k]);

		fs.writeFileSync('assets/data/DEU.json', JSON.stringify({
			NUTS3: Landkreise,
			NUTS2: Bundeslaender,
			NUTS1: Bund,
			lastUpdate: {
				cases: casesLastUpdate.toISOString().slice(0,10),
				vac: vacLastUpdate.toISOString().slice(0,10)
			},
			etag: etag
		}));
	}
	else
		tools.msg.log('Nothing to change!');
	tools.msg.log('Done!');
})();
