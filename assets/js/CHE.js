var KantonJSON;
var grossRegionenData;

const casesCHE = {
	countryData: {},

	handleClick: (feature, layer) => {
		layer.on({
			mouseover: e => e.target.setStyle(mapStyle.mouseover(feature.properties.cases7 / feature.properties.EWZ * 100000, 'incidence')),
			mouseout: e => KantonJSON.resetStyle(e.target),
			click: e => {
				var fxKanton = () => {
					toPrint = feature.properties;
					$('#LKlabel').html(toPrint.KTNAME);
					casesTableFill(toPrint);
					$('.lastUpdated').html(toPrint.casesLastUpdate.toISOString().substring(0,10));
					bgColor = mapStyle.incidence(toPrint.cases7 / toPrint.EWZ * 100000);
				};

				var fxRegion = () => {
					toPrint = grossRegionenData[feature.properties['GRNR'] - 1];
					$('#LKlabel').html(grossRegionenData[feature.properties['GRNR'] - 1].name);
					casesTableFill(toPrint);
					$('.lastUpdated').html(toPrint.casesLastUpdate.toISOString().substring(0,10));
					bgColor = mapStyle.incidence(toPrint.cases7 / toPrint.EWZ * 100000);
				};

				var fxBund = () => {
					$('#LKlabel').html('Die Schweiz / La Suisse / La Svizzera / La Svizra');
					casesTableFill(casesCHE.countryData);
					$('.lastUpdated').html(casesCHE.countryData.casesLastUpdate.toISOString().substring(0,10));
					bgColor = mapStyle.incidence(casesCHE.countryData.cases7 / casesCHE.countryData.EWZ * 100000);
				};

				regionChooser.listen('MDCTabBar:activated', detail => {
					if (feature.properties.KTCODE != 'FL') {
						switch(detail.detail.index)
						{
							case 0: fxKanton(); break;
							case 1: fxRegion(); break;
							case 2: fxBund(); break;
						}
					}
					resetTableColours(bgColor);
				});

				fxKanton();
				resetTableColours(bgColor);
				if (feature.properties.KTCODE == 'FL') {
					displayTable('Country', 'Country', 2);
					$('#regionChooser #mdc-tab-1, #regionChooser #mdc-tab-2').prop('disabled', true);
				}
				else
					displayTable('Canton', 'Region', 0);
			}
		});
	},

	showOnMap: () => {
		if (KantonJSON !== undefined) {
			KantonJSON.removeEventListener('add', layerLoaded);
			map.removeLayer(KantonJSON)
		}
		KantonJSON = L.geoJSON(Kantone, {
			style: feature => mapStyle.style(feature.properties.cases7 / feature.properties.EWZ * 100000, 'incidence'),
			onEachFeature: casesCHE.handleClick
		});
		KantonJSON.addEventListener('add', layerLoaded);
		KantonJSON.addTo(map);
	},

	pullEpidemiologicalData: () => {
		Kantone.features.sort((item1, item2) => item1.properties.KTCODE < item2.properties.KTCODE ? -1 : 1);
		grossRegionenData = grossRegionenName.map(x => ({
			name: x,
			cases28: 0,
			cases14: 0,
			cases7: 0,
			deaths28: 0,
			deaths14: 0,
			deaths7: 0,
			casesLastUpdate: new Date(),
			EWZ: 0
		}));

		$.getJSON('https://www.covid19.admin.ch/api/data/context').done(urlData => {
			var queries = [];
			queries.push(
				$.get(urlData.sources.individual.csv.daily.cases).done(data => {
					workbook = readCSV(data);

					reducedWorkbook = [];
					for (i = 0; i < workbook.length; i++) {
						if (workbook[i].timeframe_7d == "TRUE" && workbook[i + 1].timeframe_7d == "FALSE" && workbook[i].geoRegion != "CHFL") {
							if (workbook[i].geoRegion == "CH") {
								['7','14','28'].forEach(s => casesCHE.countryData['cases' + s] = workbook[i][`sumTotal_last${s}d`]);
								casesCHE.countryData.EWZ = workbook[i].pop;
								casesCHE.countryData.casesLastUpdate = convertDate.fx(workbook[i].datum);
							}
							else
								reducedWorkbook.push(workbook[i]);
						}
					}
					reducedWorkbook.sort((item1, item2) => item1.geoRegion < item2.geoRegion ? -1 : 1);

					for (i = 0; i < reducedWorkbook.length; i++) {
						['7','14','28'].forEach(s => Kantone.features[i].properties['cases' + s] = reducedWorkbook[i][`sumTotal_last${s}d`]);
						Kantone.features[i].properties.EWZ = reducedWorkbook[i].pop;
						Kantone.features[i].properties.casesLastUpdate = convertDate.fx(reducedWorkbook[i].datum);
					}
				})
			);

			queries.push(
				$.get(urlData.sources.individual.csv.daily.death).done(data => {
					workbook = readCSV(data);

					reducedWorkbook = [];
					for (i = 0; i < workbook.length; i++) {
						if (workbook[i].timeframe_7d == "TRUE" && workbook[i + 1].timeframe_7d == "FALSE" && workbook[i].geoRegion != "CHFL") {
							if (workbook[i].geoRegion == "CH")
								['7','14','28'].forEach(s => casesCHE.countryData['deaths' + s] = workbook[i][`sumTotal_last${s}d`]);
							else
								reducedWorkbook.push(workbook[i]);
						}
					}
					reducedWorkbook.sort((item1, item2) => item1.geoRegion < item2.geoRegion ? -1 : 1);

					for (i = 0; i < reducedWorkbook.length; i++)
						['7','14','28'].forEach(s => Kantone.features[i].properties['deaths' + s] = reducedWorkbook[i][`sumTotal_last${s}d`]);
				})
			);

			$.when(...queries).done(() => {
				Kantone.features.forEach(L_v => {
					if (L_v.properties.KTNR != 70) {
						['cases','deaths'].forEach(s => ['7', '14', '28'].forEach(t => grossRegionenData[parseInt(L_v.properties.GRNR, 10) - 1][s + t] += L_v.properties[s + t]));
						grossRegionenData[parseInt(L_v.properties.GRNR, 10) - 1].casesLastUpdate = new Date(Math.min(grossRegionenData[parseInt(L_v.properties.GRNR, 10) - 1].casesLastUpdate, L_v.properties.casesLastUpdate));
						grossRegionenData[parseInt(L_v.properties.GRNR, 10) - 1].EWZ += L_v.properties.EWZ
					}
				});

				casesCHE.showOnMap();
			});
		});
	},

	init: () => (Kantone.features.reduce((a,b) => a || b.properties.cases7 === undefined, false)) ? casesCHE.pullEpidemiologicalData() : casesCHE.showOnMap()
};

const vacCHE = {
	handleClick: (feature, layer) => {
		layer.on({
			mouseover: e => e.target.setStyle(mapStyle.mouseover(feature.properties.dose2 / feature.properties.EWZ * 100, 'coverage')),
			mouseout: e => KantonJSON.resetStyle(e.target),
			click: _e => {
				var fxKanton = () => {
					toPrint = feature.properties;
					$('#LKlabel').html(toPrint.KTNAME);
					vacTableFill(toPrint);
					$('.lastUpdated').html(toPrint.vacLastUpdate.toISOString().substring(0,10));

					bgColor = mapStyle.coverage(toPrint.dose2 / toPrint.EWZ * 100);
				};

				var fxRegion = () => {
					toPrint = grossRegionenData[feature.properties['GRNR'] - 1];
					$('#LKlabel').html(grossRegionenData[feature.properties['GRNR'] - 1].name);
					vacTableFill(toPrint);
					$('.lastUpdated').html(toPrint.vacLastUpdate.toISOString().substring(0,10));

					bgColor = mapStyle.coverage(toPrint.dose2 / toPrint.EWZ * 100);
				};

				var fxBund = () => {
					totalPop = grossRegionenData.reduce((a,b) => a + b.EWZ, 0);
					$('#LKlabel').html('Die Schweiz/La Suisse/La Svizzera/La Svizra');
					$('#pop').html(totalPop.toLocaleString());

					['', '_90', '_180'].forEach(t => ['2', '3'].forEach(s => {
						total = grossRegionenData.reduce((a,b) => a + b['dose' + s + t], 0);
						$('#dose' + s + t).html(total.toLocaleString());
						$('#coverage' + s + t).html((total / totalPop * 100).toLocaleString(undefined, {minimumFractionDigits: 3, maximumFractionDigits: 3}));
					}));
					$('.lastUpdated').html(grossRegionenData.reduce((a,b) => new Date(Math.min(a, b.vacLastUpdate)), new Date()).toISOString().substring(0,10));

					bgColor = mapStyle.coverage(grossRegionenData.reduce((a,b) => a + b.dose2, 0) / totalPop * 100);
				};

				regionChooser.listen('MDCTabBar:activated', detail => {
					if (feature.properties.KTCODE != 'FL') {
						switch(detail.detail.index)
						{
							case 0: fxKanton(); break;
							case 1: fxRegion(); break;
							case 2: fxBund(); break;
						}
					}
					resetTableColours(bgColor);
				});

				fxKanton();
				resetTableColours(bgColor);
				if (feature.properties.KTCODE == 'FL') {
					displayTable('Country', 'Country', 2);
					$('#regionChooser #mdc-tab-1, #regionChooser #mdc-tab-2').prop('disabled', true);
				}
				else
					displayTable('Canton', 'Region', 0);
			}
		});
	},

	showOnMap: () => {
		if (KantonJSON !== undefined) {
			KantonJSON.removeEventListener('add', layerLoaded);
			map.removeLayer(KantonJSON)
		}
		KantonJSON = L.geoJSON(Kantone, {
			style: feature => mapStyle.style(feature.properties.dose2 / feature.properties.EWZ * 100, 'coverage'),
			onEachFeature: vacCHE.handleClick
		});
		KantonJSON.addEventListener('add', layerLoaded);
		KantonJSON.addTo(map);
	},

	pullVaccineData: () => {
		grossRegionenData.forEach(x => Object.assign(x, {
			dose2_90: 0, dose2_180: 0, dose2: 0,
			dose3_90: 0, dose3_180: 0, dose3: 0,
			vacLastUpdate: new Date()
		}));

		$.getJSON('https://www.covid19.admin.ch/api/data/context').done(urlData => {
			var queries = [];
			Kantone.features.forEach(L_v => {
				queries.push($.getJSON('https://www.covid19.admin.ch/api/data/' + urlData.dataVersion + '/epidemiologic/epidemiologic-development-vacc-persons-' + L_v.properties.KTCODE.toLowerCase() + '.json').done(data => {
					L_v.properties.vacLastUpdate = convertDate.fx(data.timeSpan.end);

					data.values.sort((item1, item2) => item1.date < item2.date ? -1 : 1);
					L_v.properties.dose2 = data.values.slice(-1)[0].VaccPersonsFull.total;
					L_v.properties.dose3 = data.values.slice(-1)[0].VaccPersonsFirstBooster.total;
					[90, 180].forEach(t => {
						L_v.properties['dose2_' + t.toString(10)] = L_v.properties.dose2 - data.values.slice(-(t + 1))[0].VaccPersonsFull.total;
						L_v.properties['dose3_' + t.toString(10)] = L_v.properties.dose3 - data.values.slice(-(t + 1))[0].VaccPersonsFirstBooster.total;
					});

					if (L_v.properties.KTNR != 70) {
						['','_90','_180'].forEach(s => ['2','3'].forEach(t => grossRegionenData[parseInt(L_v.properties.GRNR, 10) - 1]['dose' + t + s] += L_v.properties['dose' + t + s]));
						grossRegionenData[parseInt(L_v.properties.GRNR, 10) - 1].vacLastUpdate = new Date(Math.min(grossRegionenData[parseInt(L_v.properties.GRNR, 10) - 1].vacLastUpdate, L_v.properties.vacLastUpdate));
					}
				}));
			});

			$.when(...queries).done(vacCHE.showOnMap);
		});
	},

	init: () => (Kantone.features.reduce((a,b) => a || b.properties.dose2 === undefined, false)) ? vacCHE.pullVaccineData() : vacCHE.showOnMap()
};
