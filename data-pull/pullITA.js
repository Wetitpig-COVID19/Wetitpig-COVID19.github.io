const axios = require('axios');
const fs = require('fs');
const tools = require('./tools');

(async () => {
	const URL = [
		'https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/dati-regioni/dpc-covid19-ita-regioni-latest.csv',
		'https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/dati-province/dpc-covid19-ita-province-latest.csv',
		'https://raw.githubusercontent.com/italia/covid19-opendata-vaccini/master/dati/somministrazioni-vaccini-latest.csv'
	];
	var etag = await Promise.all(URL.map(async url => (await axios.head(url)).headers.etag));

	var currentData;
	try {
		currentData = JSON.parse(fs.readFileSync('assets/data/ITA.json'));
	} catch (e) {
		currentData = {etag: new Array(3).fill('')};
	}

	if (etag.some((tag, index) => tag != currentData.etag[index])) {
		tools.msg.log('New data is available!');

		tools.msg.info('Pulling cases data for regions...');
		var response = await axios.get(URL[0], {
			responseType: 'text'
		});
		var workbook = await tools.csvParse(response.data);

		workbook.sort((item1, item2) => item1.codice_regione - item2.codice_regione);
		const regLastUpdate = tools.convertDate(workbook[0].data);

		workbook.splice(3,0,{
			codice_regione: 4,
			totale_casi: workbook[19].totale_casi + workbook[20].totale_casi,
			deceduti: workbook[19].deceduti + workbook[20].deceduti
		});

		var Regioni = workbook.map(row => {
			var r = {
				dose2_90: 0, dose2_180: 0, dose2: 0,
				dose3_90: 0, dose3_180: 0, dose3: 0,
				EWZ: 0
			};
			['7','14','28'].forEach(t => {
				r['cases' + t] = row.totale_casi;
				r['deaths' + t] = row.deceduti;
			});
			return r;
		}).slice(0,20);

		const casesPromises = Promise.all([7, 14, 28].map(async t => {
			dateToObtain = new Date(regLastUpdate.getTime() - 86400000 * t).toISOString().match(tools.dateRegex);
			response = await axios.get(`https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/dati-regioni/dpc-covid19-ita-regioni-${dateToObtain[1]}${dateToObtain[2]}${dateToObtain[3]}.csv`, {
				responseType: 'text'
			});
			var workbook2 = await tools.csvParse(response.data);
			workbook2.sort((item1, item2) => item1.codice_regione - item2.codice_regione);

			workbook2.splice(3,0,{
				codice_regione: 4,
				totale_casi: workbook2[19].totale_casi + workbook2[20].totale_casi,
				deceduti: workbook2[19].deceduti + workbook2[20].deceduti
			});
			Regioni.forEach((reg, i) => {
				reg['cases' + t.toString(10)] -= workbook2[i].totale_casi;
				reg['deaths' + t.toString(10)] -= workbook2[i].deceduti;
			});
		}));

		var proLastUpdate;
		var Province;
		const provincePromise = async () => {
			tools.msg.info('Pulling cases data for provinces...');
			response = await axios.get(URL[1], {
				responseType: 'text'
			});
			var workbook = (await tools.csvParse(response.data)).filter(value => value.codice_provincia < 800);
			workbook.sort((item1, item2) => item1.codice_provincia - item2.codice_provincia);

			proLastUpdate = tools.convertDate(workbook[1].data);
			Province = workbook.map(row => {
				var r = {};
				['7','14','28'].forEach(t => r['cases' + t] = row['totale_casi']);
				return r;
			});

			await Promise.all([7, 14, 28].map(async t => {
				dateToObtain = new Date(proLastUpdate.getTime() - 86400000 * t).toISOString().match(tools.dateRegex);
				response = await axios.get(`https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/dati-province/dpc-covid19-ita-province-${dateToObtain[1]}${dateToObtain[2]}${dateToObtain[3]}.csv`, {
					responseType: 'text'
				});
				workbook2 = (await tools.csvParse(response.data)).filter(value => value.codice_provincia < 800);
				workbook2.sort((item1, item2) => item1.codice_provincia - item2.codice_provincia);
				Province.forEach((pro, i) => pro['cases' + t.toString(10)] -= workbook2[i]['totale_casi']);
			}));
			tools.validate.cases(Province);
		};

		await Promise.all([casesPromises,provincePromise()]);
		tools.validate.cases(Regioni);
		tools.validate.deaths(Regioni);

		tools.msg.info('Pulling vaccine data...');
		const vaccinePromise = async () => {
			Province.slice(20, 22).forEach(x => Object.assign(x, {
				dose2_90: 0, dose2_180: 0, dose2: 0,
				dose3_90: 0, dose3_180: 0, dose3: 0
			}));

			response = await axios.get(URL[2], {
				responseType: 'text'
			});
			workbook = await tools.csvParse(response.data);
			vacLastUpdate = tools.convertDate(workbook.slice(-1)[0].data_somministrazione);
			workbook.forEach(row => {
				dateOfAdmin = tools.convertDate(row.data_somministrazione);
				[90, 180].forEach(t => {
					if ((vacLastUpdate.getTime() - dateOfAdmin.getTime()) < 86400000 * t) {
						Regioni[row.codice_regione_ISTAT - 1]['dose2_' + t.toString(10)] += row.seconda_dose + row.pregressa_infezione;
						if (row.fornitore == 'Janssen')
							Regioni[row.codice_regione_ISTAT - 1]['dose2_' + t.toString(10)] += row.prima_dose;
						Regioni[row.codice_regione_ISTAT - 1]['dose3_' + t.toString(10)] += row.dose_addizionale_booster;
					}
				});
				Regioni[row.codice_regione_ISTAT - 1].dose2 += row.seconda_dose + row.pregressa_infezione;
				if (row.fornitore == 'Janssen')
					Regioni[row.codice_regione_ISTAT - 1].dose2 += row.prima_dose;
				Regioni[row.codice_regione_ISTAT - 1].dose3 += row.dose_addizionale_booster;

				if (row.codice_regione_ISTAT == 4) {
					[90, 180].forEach(t => {
						if ((vacLastUpdate.getTime() - dateOfAdmin.getTime()) < 86400000 * t) {
							Province[19 + parseInt(row.codice_NUTS2.slice(-1), 10)]['dose2_' + t.toString(10)] += row.seconda_dose + row.pregressa_infezione;
							if (row.fornitore == 'Janssen')
								Province[19 + parseInt(row.codice_NUTS2.slice(-1), 10)]['dose2_' + t.toString(10)] += row.prima_dose;
							Province[19 + parseInt(row.codice_NUTS2.slice(-1), 10)]['dose3_' + t.toString(10)] += row.dose_addizionale_booster;
						}
					});
					Province[19 + parseInt(row.codice_NUTS2.slice(-1), 10)].dose2 += row.seconda_dose + row.pregressa_infezione;
					if (row.fornitore == 'Janssen')
						Province[19 + parseInt(row.codice_NUTS2.slice(-1), 10)].dose2 += row.prima_dose;
					Province[19 + parseInt(row.codice_NUTS2.slice(-1), 10)].dose3 += row.dose_addizionale_booster;
				}
			});
			tools.validate.vaccine(Regioni);
		};

		await vaccinePromise();

		tools.msg.info('Grouping...');
		var Repubblica = Object.values(Regioni).reduce((aggregate, R) => {
			Object.keys(R).forEach(k => aggregate[k] += R[k]);
			return aggregate;
		}, {
			cases7: 0, cases14: 0, cases28: 0,
			deaths7: 0, deaths14: 0, deaths28: 0,
			dose2_90: 0, dose2_180: 0, dose2: 0,
			dose3_90: 0, dose3_180: 0, dose3: 0,
			EWZ: 0
		});

		fs.writeFileSync('assets/data/ITA.json', JSON.stringify({
			NUTS3: Province,
			NUTS2: Regioni,
			NUTS1: Repubblica,
			lastUpdate: {
				reg: regLastUpdate.toISOString().slice(0,10),
				pro: proLastUpdate.toISOString().slice(0,10),
				vac: vacLastUpdate.toISOString().slice(0,10)
			},
			etag: etag
		}));
	}
	else
		tools.msg.log('Nothing to change!');
	tools.msg.log('Done!');
})();
