const axios = require('axios');
const fs = require('fs');
const tools = require('./tools');

(async () => {
	const URL = [
		'https://onemocneni-aktualne.mzcr.cz/api/v2/covid-19/kraj-okres-nakazeni-vyleceni-umrti.csv',
		'https://onemocneni-aktualne.mzcr.cz/api/v2/covid-19/ockovani-geografie.csv'
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
		currentData = JSON.parse(fs.readFileSync('assets/data/CZE.json'));
	} catch (e) {
		currentData = {lastModified: new Array(2).fill("1970-01-01")};
	}

	if (lastModified.some((lu, index) => tools.convertDate(currentData.lastModified[index]).getTime() - lu.getTime())) {
		tools.msg.log('New data is available!');

		var Kraje = new Array(14).fill(null).map(() => Object.assign({}, ...Object.values(tools.baseJSON)));
		var Regione = ['Praha','Střední Čechy','Jihozápad','Severozápad','Severovýchod','Jihovýchod','Střední Morava','Moravskoslezsko'].map(name => Object.assign({
			name: name, EWZ: 0
		}, ...Object.values(tools.baseJSON)));
		var Republika = Object.assign({ EWZ: 0 }, ...Object.values(tools.baseJSON));
		var casesLastUpdate;

		const casesPromise = async () => {
			tools.msg.info('Pulling cases data...');

			var workbook = await tools.csvPull(URL[0], {
				kraj_nuts_kod: 'string',
				datum: 'date',
				kumulativni_pocet_nakazenych: 'number',
				kumulativni_pocet_umrti: 'number'
			});
			workbook.sort((item1, item2) => item1.datum.getTime() != item2.datum.getTime() ? item2.datum.getTime() - item1.datum.getTime() : item1.kraj_nuts_kod < item2.kraj_nuts_kod ? -1 : 1);
			casesLastUpdate = workbook[0].datum.toISOString().slice(0,10);

			var regionIndex = 0;
			workbook.filter((_value, index) => index && index < 78).forEach((row, index, self) => {
				if (index && self[index - 1].kraj_nuts_kod != row.kraj_nuts_kod)
					regionIndex++;
				[7,14,28].forEach(t => {
					Kraje[regionIndex]['cases' + t] += row.kumulativni_pocet_nakazenych - workbook[78 * t + index + 1].kumulativni_pocet_nakazenych;
					Kraje[regionIndex]['deaths' + t] += row.kumulativni_pocet_umrti - workbook[78 * t + index + 1].kumulativni_pocet_umrti;
					Regione[Math.floor(parseInt(row.kraj_nuts_kod.slice(2), 10) / 10) - 1]['cases' + t] += row.kumulativni_pocet_nakazenych - workbook[78 * t + index + 1].kumulativni_pocet_nakazenych;
					Regione[Math.floor(parseInt(row.kraj_nuts_kod.slice(2), 10) / 10) - 1]['deaths' + t] += row.kumulativni_pocet_umrti - workbook[78 * t + index + 1].kumulativni_pocet_umrti;
				});
			});
			[7,14,28].forEach(t => {
				Republika['cases' + t] = workbook[0].kumulativni_pocet_nakazenych - workbook[78 * t].kumulativni_pocet_nakazenych + Regione.reduce((aggregate, r) => aggregate + r['cases' + t], 0);
				Republika['deaths' + t] = workbook[0].kumulativni_pocet_umrti - workbook[78 * t].kumulativni_pocet_umrti + Regione.reduce((aggregate, r) => aggregate + r['deaths' + t], 0);
			});

			tools.validate.cases(Kraje);
			tools.validate.deaths(Kraje);
		};

		var vacLastUpdate;
		const vaccinePromise = async () => {
			tools.msg.info('Pulling vaccine data...');

			var workbook = (await tools.csvPull(URL[1], {
				orp_bydliste_kod: 'number',
				kraj_nuts_kod: 'number',
				datum: 'date',
				poradi_davky: 'number',
				pocet_davek: 'number'
			})).filter(value => value.poradi_davky != 1);
			vacLastUpdate = workbook.reduce((aggregate, row) => Math.max(aggregate, row.datum.getTime()), 0);
			vacLastUpdate = new Date(vacLastUpdate);

			var regionIndex;
			workbook.forEach(row => {
				regionIndex = row.orp_bydliste_kod ? Math.floor(row.orp_bydliste_kod / 1000) - 1 : Math.floor(parseInt(row.kraj_nuts_kod.slice(2), 10) / 10) - 1;
				[90,180].forEach(t => {
					if ((vacLastUpdate.getTime() - row.datum.getTime()) < t * 86400000) {
						Kraje[regionIndex][`dose${row.poradi_davky}_${t.toString(10)}`] += row.pocet_davek;
						Regione[regionIndex][`dose${row.poradi_davky}_${t.toString(10)}`] += row.pocet_davek;
					}
				});
				Kraje[regionIndex]['dose' + row.poradi_davky] += row.pocet_davek;
				Regione[regionIndex]['dose' + row.poradi_davky] += row.pocet_davek;
			});

			vacLastUpdate = vacLastUpdate.toISOString().slice(0,10);
			tools.validate.vaccine(Kraje);
		};

		await Promise.all([casesPromise(), vaccinePromise()]);

		Regione.forEach(R => ['', '_90', '_180'].forEach(k1 => ['2', '3'].forEach(k2 => Republika['dose' + k2 + k1] += R['dose' + k2 + k1])));

		fs.writeFileSync('assets/data/CZE.json', JSON.stringify({
			NUTS3: Kraje,
			NUTS2: Regione,
			NUTS1: Republika,
			lastModified: lastModified,
			lastUpdate: {
				cases: casesLastUpdate,
				vac: vacLastUpdate
			}
		}));
	}
	else
		tools.msg.log('Nothing to change!');
	tools.msg.log('Done!');
})();
