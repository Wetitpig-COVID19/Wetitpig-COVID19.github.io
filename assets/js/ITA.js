var ProvinceJSON;
var regioniData;

const casesITA = {
	regLastUpdate: null,
	proLastUpdate: null,

	handleClick: (feature, layer) => {
		layer.on({
			mouseover: e => e.target.setStyle(mapStyle.mouseover(feature.properties.cases7 / feature.properties.EWZ * 100000, 'incidence')),
			mouseout: e => ProvinceJSON.resetStyle(e.target),
			click: () => {
				var fxProvince = () => {
					toPrint = feature.properties;
					$('#LKlabel').html(toPrint.prov_name);
					$('#pop').html(toPrint.EWZ.toLocaleString());

					['7','14','28'].forEach(s => {
						$('#cases' + s).html(toPrint['cases' + s].toLocaleString());
						$('#incidence' + s).html((toPrint['cases' + s] / toPrint.EWZ * 100000).toLocaleString(undefined, {minimumFractionDigits: 3, maximumFractionDigits: 3}));
						$('#deaths' + s + ', #mortality' + s).html('N/A');
					});
					$('.lastUpdated').html(casesITA.proLastUpdate.toISOString().substring(0,10));
					bgColor = mapStyle.incidence(toPrint.cases7 / toPrint.EWZ * 100000);
				};

				var fxRegione = () => {
					toPrint = regioniData[feature.properties.reg_istat_code_num - 1];
					$('#LKlabel').html(feature.properties.reg_name);
					casesTableFill(toPrint);
					$('.lastUpdated').html(casesITA.regLastUpdate.toISOString().substring(0,10));
					bgColor = mapStyle.incidence(toPrint.cases7 / toPrint.EWZ * 100000);
				};

				var fxRepubblica = () => {
					$('#LKlabel').html('Italia');
					totalPop = regioniData.reduce((a,b) => a + b.EWZ, 0);
					$('#pop').html(totalPop.toLocaleString());

					['7','14','28'].forEach(s => {
						[['cases', 'incidence'], ['deaths', 'mortality']].forEach(t => {
							total = regioniData.reduce((a,b) => a + b[t[0] + s], 0);
							$('#' + t[0] + s).html(total.toLocaleString());
							$('#' + t[1] + s).html((total / totalPop * 100000).toLocaleString(undefined, {minimumFractionDigits: 3, maximumFractionDigits: 3}));
						});
					});
					$('.lastUpdated').html(casesITA.regLastUpdate.toISOString().substring(0,10));
					bgColor = mapStyle.incidence(regioniData.reduce((a,b) => a + b.cases7, 0) / totalPop * 100000);
				};

				regionChooser.listen('MDCTabBar:activated', detail => {
					switch(detail.detail.index)
					{
						case 0: fxProvince(); break;
						case 1: fxRegione(); break;
						case 2: fxRepubblica(); break;
					}
					resetTableColours(bgColor);
				});

				fxProvince();
				resetTableColours(bgColor);
				displayTable('Province', 'Region', 0);
			}
		});
	},

	showOnMap: () => {
		if (ProvinceJSON !== undefined) {
			ProvinceJSON.removeEventListener('add', layerLoaded);
			map.removeLayer(ProvinceJSON)
		}
		ProvinceJSON = L.geoJSON(Province, {
			style: feature => mapStyle.style(feature.properties.cases7 / feature.properties.EWZ * 100000, 'incidence'),
			onEachFeature: casesITA.handleClick
		});
		ProvinceJSON.addEventListener('add', layerLoaded);
		ProvinceJSON.addTo(map);
	},

	pullEpidemiologicalData: () => {
		Province.features.sort((item1, item2) => item1.properties.prov_istat_code_num - item2.properties.prov_istat_code_num);
		regioniData = new Array(20).fill(null).map(() => ({ EWZ: 0 }));
		Province.features.forEach(L_v => regioniData[L_v.properties.reg_istat_code_num - 1].EWZ += L_v.properties.EWZ);

		$.get('https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/dati-regioni/dpc-covid19-ita-regioni-latest.csv').done(urlData => {
			workbook = readCSV(urlData);
			workbook.sort((item1, item2) => item1.codice_regione - item2.codice_regione);

			casesITA.regLastUpdate = convertDate.fx(workbook[0].data);
			workbook.splice(3,0,{
				codice_regione: 4,
				totale_casi: workbook[19].totale_casi + workbook[20].totale_casi,
				deceduti: workbook[19].deceduti + workbook[20].deceduti
			});

			for (i = 0; i < 20; i++)
				['7','14','28'].forEach(t => {
					regioniData[i]['cases' + t] = workbook[i]['totale_casi'];
					regioniData[i]['deaths' + t] = workbook[i]['deceduti'];
				});

			[7, 14, 28].forEach(t => {
				dateToObtain = new Date(casesITA.regLastUpdate.getTime() - 86400000 * t).toISOString().split(/\D+/);
				$.get(`https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/dati-regioni/dpc-covid19-ita-regioni-${dateToObtain[0]}${dateToObtain[1]}${dateToObtain[2]}.csv`).done(data => {
					workbook2 = readCSV(data);
					workbook2.sort((item1, item2) => item1.codice_regione - item2.codice_regione);

					workbook2.splice(3,0,{
						codice_regione: 4,
						totale_casi: workbook2[19].totale_casi + workbook2[20].totale_casi,
						deceduti: workbook2[19].deceduti + workbook2[20].deceduti
					});
					for (i = 0; i < 20; i++) {
						regioniData[i]['cases' + t.toString(10)] -= workbook2[i]['totale_casi'];
						regioniData[i]['deaths' + t.toString(10)] -= workbook2[i]['deceduti'];
					}
				});
			});
		});

		$.get('https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/dati-province/dpc-covid19-ita-province-latest.csv').done(urlData => {
			workbook = readCSV(urlData).filter(value => value.codice_provincia < 800);
			workbook.sort((item1, item2) => item1.codice_provincia - item2.codice_provincia);
			var queries = [];

			casesITA.proLastUpdate = convertDate.fx(workbook[1].data);
			for (i = 0; i < 107; i++)
				['7','14','28'].forEach(t => Province.features[i].properties['cases' + t] = workbook[i]['totale_casi']);

			[7, 14, 28].forEach(t => {
				dateToObtain = new Date(casesITA.proLastUpdate.getTime() - 86400000 * t).toISOString().match(convertDate.regex);
				queries.push(
					$.get(`https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/dati-province/dpc-covid19-ita-province-${dateToObtain[1]}${dateToObtain[2]}${dateToObtain[3]}.csv`).done(data => {
						workbook2 = readCSV(data).filter(value => value.codice_provincia < 800);
						workbook2.sort((item1, item2) => item1.codice_provincia - item2.codice_provincia);
						for (i = 0; i < 107; i++)
							Province.features[i].properties['cases' + t.toString(10)] -= workbook2[i]['totale_casi'];
					})
				);
			});

			$.when(...queries).done(casesITA.showOnMap);
		});
	},

	init: () => (Province.features.reduce((a,b) => a || b.properties.cases7 === undefined, false)) ? casesITA.pullEpidemiologicalData() : casesITA.showOnMap()
};

const vacITA = {
	lastUpdate: null,

	handleClick: (feature, layer) => {
		layer.on({
			mouseover: e => e.target.setStyle(mapStyle.mouseover((feature.properties.reg_istat_code_num == 4 ? feature.properties.dose2 / feature.properties.EWZ : regioniData[feature.properties.reg_istat_code_num - 1].dose2 / regioniData[feature.properties.reg_istat_code_num - 1].EWZ) * 100, 'coverage')),
			mouseout: e => ProvinceJSON.resetStyle(e.target),
			click: _e => {
				var fxProvince = () => {
					toPrint = feature.properties;
					$('#LKlabel').html(toPrint.prov_name);
					toPrint.reg_istat_code_num == 4 ? vacTableFill(toPrint) : $('#vaccine-details .mdc-data-table__cell--numeric').html('N/A');
					$('.lastUpdated').html(vacITA.lastUpdate.toISOString().substring(0,10));

					bgColor = mapStyle.coverage((toPrint.reg_istat_code_num == 4 ? toPrint.dose2 / toPrint.EWZ : regioniData[toPrint.reg_istat_code_num - 1].dose2 / regioniData[toPrint.reg_istat_code_num - 1].EWZ) * 100);
				};

				var fxRegione = () => {
					toPrint = regioniData[feature.properties.reg_istat_code_num - 1];
					$('#LKlabel').html(feature.properties.reg_name);
					vacTableFill(toPrint);
					$('.lastUpdated').html(vacITA.lastUpdate.toISOString().substring(0,10));

					bgColor = mapStyle.coverage(toPrint.dose2 / toPrint.EWZ * 100);
				};

				var fxRepubblica = () => {
					totalPop = regioniData.reduce((a,b) => a + b.EWZ, 0);
					$('#LKlabel').html('Italia');
					$('#pop').html(totalPop.toLocaleString());

					['', '_90', '_180'].forEach(t => ['2', '3'].forEach(s => {
						total = regioniData.reduce((a,b) => a + b['dose' + s + t], 0);
						$('#dose' + s + t).html(total.toLocaleString());
						$('#coverage' + s + t).html((total / totalPop * 100).toLocaleString(undefined, {minimumFractionDigits: 3, maximumFractionDigits: 3}));
					}));
					$('.lastUpdated').html(vacITA.lastUpdate.toISOString().substring(0,10));

					bgColor = mapStyle.coverage(regioniData.reduce((a,b) => a + b.dose2, 0) / totalPop * 100);
				};

				regionChooser.listen('MDCTabBar:activated', detail => {
					switch(detail.detail.index)
					{
						case 0: fxProvince(); break;
						case 1: fxRegione(); break;
						case 2: fxRepubblica(); break;
					}
					resetTableColours(bgColor);
				});

				if (feature.properties.reg_istat_code_num == 4) {
					fxProvince();
					displayTable('Province', 'Region', 0);
				}
				else {
					fxRegione();
					displayTable('Province', 'Region', 1);
				}
				resetTableColours(bgColor);
			}
		});
	},

	showOnMap: () => {
		if (ProvinceJSON !== undefined) {
			ProvinceJSON.removeEventListener('add', layerLoaded);
			map.removeLayer(ProvinceJSON)
		}
		ProvinceJSON = L.geoJSON(Province, {
			style: feature => mapStyle.style((feature.properties.reg_istat_code_num == 4 ? feature.properties.dose2 / feature.properties.EWZ : regioniData[feature.properties.reg_istat_code_num - 1].dose2 / regioniData[feature.properties.reg_istat_code_num - 1].EWZ) * 100, 'coverage'),
			onEachFeature: vacITA.handleClick
		});
		ProvinceJSON.addEventListener('add', layerLoaded);
		ProvinceJSON.addTo(map);
	},

	pullVaccineData: () => {
		regioniData.forEach(x => Object.assign(x, {
			dose2_90: 0, dose2_180: 0, dose2: 0,
			dose3_90: 0, dose3_180: 0, dose3: 0
		}));
		Province.features.slice(20, 22).forEach(x => Object.assign(x.properties, {
			dose2_90: 0, dose2_180: 0, dose2: 0,
			dose3_90: 0, dose3_180: 0, dose3: 0
		}));

		$.get('https://raw.githubusercontent.com/italia/covid19-opendata-vaccini/master/dati/somministrazioni-vaccini-latest.csv').done(data => {
			workbook = readCSV(data);
			vacITA.lastUpdate = convertDate.fx(workbook.slice(-1)[0].data_somministrazione);
			workbook.forEach(row => {
				dateOfAdmin = convertDate.fx(row.data_somministrazione);
				[90, 180].forEach(t => {
					if ((vacITA.lastUpdate.getTime() - dateOfAdmin.getTime()) < 86400000 * t) {
						regioniData[row.codice_regione_ISTAT - 1]['dose2_' + t.toString(10)] += row.seconda_dose + row.pregressa_infezione;
						if (row.fornitore == 'Janssen')
							regioniData[row.codice_regione_ISTAT - 1]['dose2_' + t.toString(10)] += row.prima_dose;
						regioniData[row.codice_regione_ISTAT - 1]['dose3_' + t.toString(10)] += row.dose_addizionale_booster;
					}
				});
				regioniData[row.codice_regione_ISTAT - 1].dose2 += row.seconda_dose + row.pregressa_infezione;
				if (row.fornitore == 'Janssen')
					regioniData[row.codice_regione_ISTAT - 1].dose2 += row.prima_dose;
				regioniData[row.codice_regione_ISTAT - 1].dose3 += row.dose_addizionale_booster;

				if (row.codice_regione_ISTAT == 4) {
					[90, 180].forEach(t => {
						if ((vacITA.lastUpdate.getTime() - dateOfAdmin.getTime()) < 86400000 * t) {
							Province.features[19 + parseInt(row.codice_NUTS2.slice(-1), 10)].properties['dose2_' + t.toString(10)] += row.seconda_dose + row.pregressa_infezione;
							if (row.fornitore == 'Janssen')
								Province.features[19 + parseInt(row.codice_NUTS2.slice(-1), 10)].properties['dose2_' + t.toString(10)] += row.prima_dose;
							Province.features[19 + parseInt(row.codice_NUTS2.slice(-1), 10)].properties['dose3_' + t.toString(10)] += row.dose_addizionale_booster;
						}
					});
					Province.features[19 + parseInt(row.codice_NUTS2.slice(-1), 10)].properties.dose2 += row.seconda_dose + row.pregressa_infezione;
					if (row.fornitore == 'Janssen')
						Province.features[19 + parseInt(row.codice_NUTS2.slice(-1), 10)].properties.dose2 += row.prima_dose;
					Province.features[19 + parseInt(row.codice_NUTS2.slice(-1), 10)].properties.dose3 += row.dose_addizionale_booster;
				}
			});

			vacITA.showOnMap();
		});
	},

	init: () => ((regioniData.reduce((a,b) => a || b.dose2 === undefined, false)) ? vacITA.pullVaccineData() : vacITA.showOnMap())
};
