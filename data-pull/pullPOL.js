const axios = require('axios');
const fs = require('fs');
const tools = require('./tools');
const xml2js = require('xml2js');
const JSZip = require('jszip');

(async () => {
	var xmlParser = new xml2js.Parser();
	const URL = [
		'https://www.arcgis.com/sharing/rest/content/items/e16df1fa98c2452783ec10b0aea4b341',
		'https://www.arcgis.com/sharing/rest/content/items/b860f2797f7f4da789cb6fccf6bd5bc7'
	];
	var lastModified = await Promise.all(
		URL.map(async url => {
			var response = await axios.get(url + '/info/item.pkinfo');
			response = await xmlParser.parseStringPromise(response.data);
			var date = new Date(parseInt(response.pkinfo.created[0], 10));
			return date;
		})
	);

	var currentData;
	try {
		currentData = JSON.parse(fs.readFileSync('assets/data/POL.json'));
	} catch (e) {
		currentData = {lastModified: new Array(2).fill(null).map(() => new Date(0))};
	}

	if (lastModified.some((lmTime, index) => lmTime.getTime() - currentData.lastModified[index])) {
		tools.msg.log('New data is available!');

		var Powiat = new Array(380).fill(null).map(() => Object.assign({}, tools.baseJSON.cases));
		var Wojewodztwo = new Array(16).fill(null).map(() => Object.assign({ EWZ: 0 }, tools.baseJSON.cases));
		var Rzeczpospolita = Object.assign({}, tools.baseJSON.cases);
		var casesLastUpdate;
		var powLastUpdate;
		var wojLastUpdate;
		var globalLastUpdate;

		const casesPromise = async () => {
			tools.msg.info('Pulling cases data...');
			var responseBuffer = (await axios.get(URL[0] + '/data', {
				headers: tools.compressHeaders,
				responseType: 'arrayBuffer',
				responseEncoding: 'binary'
			})).data;
			var zipFile = new JSZip();
			zipFile = await zipFile.loadAsync(responseBuffer);

			var zipEntries = Object.values(zipFile.files).filter(value => value.name != 'readme.txt');
			zipEntries.sort((entry1, entry2) => entry1.name > entry2.name ? -1 : 1);
			casesLastUpdate = [zipEntries[0].name.slice(0,4),zipEntries[0].name.slice(4,6),zipEntries[0].name.slice(6,8)].join('-');

			var workbook;
			var i;
			for (i = 0; i < 7; i++) {
				workbook = await zipFile.file(zipEntries[i].name).async('string');
				workbook = await tools.csvParse(workbook);
				workbook.sort((item1,item2) => parseInt(item1.teryt.slice(1), 10) - parseInt(item2.teryt.slice(1), 10));
				var rep = workbook.shift();
				['7','14','28'].forEach(t => {
					Powiat.forEach((pow, index) => {
						pow['cases' + t] += workbook[index].liczba_przypadkow;
						pow['deaths' + t] += workbook[index].zgony;
						Wojewodztwo[Math.floor(parseInt(workbook[index].teryt.slice(1), 10) / 200) - 1]['cases' + t] += workbook[index].liczba_przypadkow;
						Wojewodztwo[Math.floor(parseInt(workbook[index].teryt.slice(1), 10) / 200) - 1]['deaths' + t] += workbook[index].zgony;
					});
					Rzeczpospolita['cases' + t] += rep.liczba_przypadkow;
					Rzeczpospolita['deaths' + t] += rep.zgony;
				});
			}
			for (; i < 14; i++) {
				workbook = await zipFile.file(zipEntries[i].name).async('string');
				workbook = await tools.csvParse(workbook);
				workbook.sort((item1,item2) => parseInt(item1.teryt.slice(1), 10) - parseInt(item2.teryt.slice(1), 10));
				var rep = workbook.shift();
				['14','28'].forEach(t => {
					Powiat.forEach((pow, index) => {
						pow['cases' + t] += workbook[index].liczba_przypadkow;
						pow['deaths' + t] += workbook[index].zgony;
						Wojewodztwo[Math.floor(parseInt(workbook[index].teryt.slice(1), 10) / 200) - 1]['cases' + t] += workbook[index].liczba_przypadkow;
						Wojewodztwo[Math.floor(parseInt(workbook[index].teryt.slice(1), 10) / 200) - 1]['deaths' + t] += workbook[index].zgony;
					});
					Rzeczpospolita['cases' + t] += rep.liczba_przypadkow;
					Rzeczpospolita['deaths' + t] += rep.zgony;
				});
			}
			for (; i < 28; i++) {
				workbook = await zipFile.file(zipEntries[i].name).async('string');
				workbook = await tools.csvParse(workbook);
				workbook.sort((item1,item2) => parseInt(item1.teryt.slice(1), 10) - parseInt(item2.teryt.slice(1), 10));
				var rep = workbook.shift();
				Powiat.forEach((pow, index) => {
					pow.cases28 += workbook[index].liczba_przypadkow;
					pow.deaths28 += workbook[index].zgony;
					Wojewodztwo[Math.floor(parseInt(workbook[index].teryt.slice(1), 10) / 200) - 1].cases28 += workbook[index].liczba_przypadkow;
					Wojewodztwo[Math.floor(parseInt(workbook[index].teryt.slice(1), 10) / 200) - 1].deaths28 += workbook[index].zgony;
				});
				Rzeczpospolita.cases28 += rep.liczba_przypadkow;
				Rzeczpospolita.deaths28 += rep.zgony;
			}

			tools.validate.cases([...Powiat,Rzeczpospolita]);
			tools.validate.deaths([...Powiat,Rzeczpospolita]);
		};

		const vaccinePromise = async () => {
			var promises = [];
			tools.msg.info('Pulling vaccine data...');
			var responseBuffer = (await axios.get(URL[1] + '/data', {
				headers: tools.compressHeaders,
				responseType: 'arrayBuffer',
				responseEncoding: 'binary'
			})).data;
			var zipFile = new JSZip();
			zipFile = await zipFile.loadAsync(responseBuffer);

			var zipEntries = Object.values(zipFile.files).filter(value => value.name.match('rap_rcb_pow_szczepienia.csv'));
			zipEntries.sort((entry1, entry2) => entry1.name > entry2.name ? -1 : 1);
			powLastUpdate = [zipEntries[0].name.slice(0,4),zipEntries[0].name.slice(4,6),zipEntries[0].name.slice(6,8)].join('-');

			var workbook = await zipFile.file(zipEntries[0].name).async('string');
			workbook = await tools.csvParse(workbook);
			workbook.sort((item1,item2) => parseInt(item1.teryt.slice(1), 10) - parseInt(item2.teryt.slice(1), 10));
			var rep = workbook.splice(0,2)[1];
			['_90','_180',''].forEach(t => {
				Powiat.forEach((pow, index) => {
					pow['dose2' + t] = workbook[index].dawka_2_ogolem;
					pow['dose3' + t] = workbook[index].dawka_przypominajaca_ogolem;
				});
				Rzeczpospolita['dose2' + t] = rep.dawka_2_ogolem;
				Rzeczpospolita['dose3' + t] = rep.dawka_przypominajaca_ogolem;
			});

			promises.push([90,180].forEach(async t => {
				workbook = await zipFile.file(zipEntries[t].name).async('string');
				workbook = await tools.csvParse(workbook);
				workbook.sort((item1,item2) => parseInt(item1.teryt.slice(1), 10) - parseInt(item2.teryt.slice(1), 10));
				var rep = workbook.splice(0,2)[1];
				Powiat.forEach((pow,index) => {
					pow['dose2_' + t.toString(10)] -= workbook[index].dawka_2_ogolem;
					pow['dose3_' + t.toString(10)] -= isNaN(workbook[index].dawka_przypominajaca_ogolem) ? 0 : workbook[index].dawka_przypominajaca_ogolem;
				});
				Rzeczpospolita['dose2' + t] -= rep.dawka_2_ogolem;
				Rzeczpospolita['dose3' + t] -= rep.dawka_przypominajaca_ogolem;
			}));

			zipEntries = Object.values(zipFile.files).filter(value => value.name.match('rap_rcb_woj_szczepienia.csv'));
			zipEntries.sort((entry1, entry2) => entry1.name > entry2.name ? -1 : 1);
			wojLastUpdate = [zipEntries[0].name.slice(0,4),zipEntries[0].name.slice(4,6),zipEntries[0].name.slice(6,8)].join('-');

			workbook = await zipFile.file(zipEntries[0].name).async('string');
			workbook = await tools.csvParse(workbook);
			workbook.sort((item1,item2) => parseInt(item1.teryt.slice(1), 10) - parseInt(item2.teryt.slice(1), 10));
			workbook.splice(0,2);
			['_90','_180',''].forEach(t => Wojewodztwo.forEach((pow, index) => {
				pow['dose2' + t] = workbook[index].dawka_2_ogolem;
				pow['dose3' + t] = workbook[index].dawka_przypominajaca_ogolem;
			}));

			promises.push([90,180].forEach(async t => {
				workbook = await zipFile.file(zipEntries[t].name).async('string');
				workbook = await tools.csvParse(workbook);
				workbook.sort((item1,item2) => parseInt(item1.teryt.slice(1), 10) - parseInt(item2.teryt.slice(1), 10));
				workbook.splice(0,2);
				Wojewodztwo.forEach((pow,index) => {
					pow['dose2_' + t.toString(10)] -= workbook[index].dawka_2_ogolem;
					pow['dose3_' + t.toString(10)] -= isNaN(workbook[index].dawka_przypominajaca_ogolem) ? 0 : workbook[index].dawka_przypominajaca_ogolem;
				})
			}));

			await Promise.all(promises.flat())

			tools.validate.vaccine([...Powiat,...Wojewodztwo,Rzeczpospolita]);
		};

		await Promise.all([casesPromise(), vaccinePromise()]);

		fs.writeFileSync('assets/data/POL.json', JSON.stringify({
			NUTS3: Powiat,
			NUTS2: Wojewodztwo,
			NUTS1: Rzeczpospolita,
			lastUpdate: {
				cases: casesLastUpdate,
				pow: powLastUpdate,
				woj: wojLastUpdate,
				rep: globalLastUpdate
			},
			lastModified: lastModified
		}));
	}
	else
		tools.msg.log('Nothing to change!');
	tools.msg.log('Done!');
})();
