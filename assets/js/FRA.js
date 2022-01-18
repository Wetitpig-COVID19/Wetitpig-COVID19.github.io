var DepartementJSON;
var regionsData;

const casesFRA = {
	casesLastUpdate: null,
	deathsLastUpdate: null,

	handleClick: (feature, layer) => {
		layer.on({
			mouseover: e => e.target.setStyle(mapStyle.mouseover(feature.properties.cases7 / feature.properties.EWZ * 100000, 'incidence')),
			mouseout: e => DepartementJSON.resetStyle(e.target),
			click: _e => {
				var fxDepartement = () => {
					toPrint = feature.properties;
					$('#LKlabel').html(toPrint.nom);
					casesTableFill(toPrint);
					$('.lastUpdated').html(`Cases: ${casesFRA.casesLastUpdate.toISOString().substring(0,10)}<br>Deaths: ${casesFRA.deathsLastUpdate.toISOString().substring(0,10)}`);
					bgColor = mapStyle.incidence(toPrint.cases7 / toPrint.EWZ * 100000);
				};

				var fxRegion = () => {
					toPrint = regionsData[feature.properties.reg_code];
					$('#LKlabel').html(feature.properties.reg);
					casesTableFill(toPrint);
					$('.lastUpdated').html(`Cases: ${casesFRA.casesLastUpdate.toISOString().substring(0,10)}<br>Deaths: ${casesFRA.deathsLastUpdate.toISOString().substring(0,10)}`);
					bgColor = mapStyle.incidence(toPrint.cases7 / toPrint.EWZ * 100000);
				};

				var fxRepublique = () => {
					totalPop = Object.keys(regionsData).reduce((a,b) => a + regionsData[b].EWZ, 0);
					$('#LKlabel').html('France');
					$('#pop').html(totalPop.toLocaleString());

					['7','14','28'].forEach(s => {
						[['cases', 'incidence'], ['deaths', 'mortality']].forEach(t => {
							total = Object.keys(regionsData).reduce((a,b) => a + regionsData[b][t[0] + s.toString(10)], 0);
							$('#' + t[0] + s).html(total.toLocaleString());
							$('#' + t[1] + s).html((total / totalPop * 100000).toLocaleString(undefined, {minimumFractionDigits: 3, maximumFractionDigits: 3}));
						});
					});
					$('.lastUpdated').html(`Cases: ${casesFRA.casesLastUpdate.toISOString().substring(0,10)}<br>Deaths: ${casesFRA.deathsLastUpdate.toISOString().substring(0,10)}`);
					bgColor = mapStyle.incidence(Object.keys(regionsData).reduce((a,b) => a + regionsData[b].cases7, 0) / totalPop * 100000);
				};

				regionChooser.listen('MDCTabBar:activated', detail => {
					switch(detail.detail.index)
					{
						case 0: fxDepartement(); break;
						case 1: fxRegion(); break;
						case 2: fxRepublique(); break;
					}
					resetTableColours(bgColor);
				});

				fxDepartement();
				resetTableColours(bgColor);
				displayTable('Department', 'Region', 0);
			}
		});
	},

	showOnMap: () => {
		DepartementJSON.removeEventListener('add', layerLoaded);
		map.removeLayer(DepartementJSON);
		DepartementJSON = L.geoJSON(Departements, {
			style: feature => mapStyle.style(feature.properties.cases7 / feature.properties.EWZ * 100000, 'incidence'),
			onEachFeature: casesFRA.handleClick
		});
		DepartementJSON.addEventListener('add', layerLoaded);
		DepartementJSON.addTo(map);
	},

	pullEpidemiologicalData: () => {
		Departements.features.sort((item1, item2) => parseInt(item1.properties.code, 16) - parseInt(item2.properties.code, 16));
		regionsData = listOfRegions.reduce((a, code) => {
			a[code] = {
				cases7: 0, cases14: 0, cases28: 0,
                deaths7: 0, deaths14: 0, deaths28: 0,
				EWZ: 0
			};
			return a;
		}, {});

	  	var queries = [];
		queries.push($.get('https://www.data.gouv.fr/fr/datasets/r/406c6a23-e283-4300-9484-54e78c8ae675').done(data => {
			data = preprocessCSVFRA(data);
			workbook = readCSV(data, ';', false);
			workbook = workbook.filter(value => (isNaN(value.dep) || value.dep < 100) && value.cl_age90 == 0);
			workbook.sort((a,b) => {
				if (parseInt((isNaN(a.dep) ? a.dep : a.dep.toString(10)), 16) < parseInt((isNaN(b.dep) ? b.dep : b.dep.toString(10)), 16)) return -1;
				else if (parseInt((isNaN(a.dep) ? a.dep : a.dep.toString(10)), 16) > parseInt((isNaN(b.dep) ? b.dep : b.dep.toString(10)), 16)) return 1;
				else return b.jour < a.jour ? -1 : 1;
			});

			casesFRA.casesLastUpdate = convertDate.fx(workbook[0].jour);
			numberOfDays = workbook.length / 96;
			for (i = 0; i < 96; i++) {
				[7,14,28].forEach(j => {
					Departements.features[i].properties['cases' + j.toString(10)] = workbook.slice(i * numberOfDays, i * numberOfDays + j).reduce((a,b) => a + b.P, 0);
					regionsData[Departements.features[i].properties.reg_code]['cases' + j.toString(10)] += Departements.features[i].properties['cases' + j.toString(10)];
				});
				Departements.features[i].properties.EWZ = workbook[i * numberOfDays].pop;
				regionsData[Departements.features[i].properties.reg_code].EWZ += workbook[i * numberOfDays].pop;
			}
		}));

		queries.push($.get('https://www.data.gouv.fr/fr/datasets/r/6fadff46-9efd-4c53-942a-54aca783c30c').done(data => {
			data = preprocessCSVFRA(data);
			workbook = readCSV(data, ';', false);
			workbook = workbook.filter(value => value.dep.substring(0,3) != '"97');
			workbook.sort((a,b) => {
				if (parseInt(a.dep, 16) < parseInt(b.dep, 16)) return -1;
				else if (parseInt(a.dep, 16) > parseInt(b.dep, 16)) return 1;
				else return b.jour < a.jour ? -1 : 1;
			});

			casesFRA.deathsLastUpdate = convertDate.fx(workbook[0].jour);
			numberOfDays = workbook.length / 96;
			for (i = 0; i < 96; i++)
				[7,14,28].forEach(j => {
					Departements.features[i].properties['deaths' + j.toString(10)] = workbook.slice(i * numberOfDays, i * numberOfDays + j).reduce((a,b) => a + b.incid_dc, 0);
					regionsData[Departements.features[i].properties.reg_code]['deaths' + j.toString(10)] += Departements.features[i].properties['deaths' + j.toString(10)];
				});
		}));

		$.when(...queries).done(casesFRA.showOnMap);
	},

	init: () => (Departements.features.reduce((a,b) => a || b.properties.cases7 === undefined, false)) ? casesFRA.pullEpidemiologicalData() : casesFRA.showOnMap()
};

const vacFRA = {
	lastUpdate: null,

	handleClick: (feature, layer) => {
		layer.on({
			mouseover: e => e.target.setStyle(mapStyle.mouseover(feature.properties.dose2 / feature.properties.EWZ * 100, 'coverage')),
			mouseout: e => DepartementJSON.resetStyle(e.target),
			click: _e => {
				var fxDepartement = () => {
					toPrint = feature.properties;
					$('#LKlabel').html(toPrint.nom);
					vacTableFill(toPrint);
					$('.lastUpdated').html(vacFRA.lastUpdate.toISOString().substring(0,10));

					bgColor = mapStyle.coverage(toPrint.dose2 / toPrint.EWZ * 100);
				};

				var fxRegion = () => {
					toPrint = regionsData[feature.properties.reg_code];
					$('#LKlabel').html(feature.properties.reg);
					vacTableFill(toPrint);
					$('.lastUpdated').html(vacFRA.lastUpdate.toISOString().substring(0,10));

					bgColor = mapStyle.coverage(toPrint.dose2 / toPrint.EWZ * 100);
				};

				var fxRepublique = () => {
					totalPop = Object.keys(regionsData).reduce((a,b) => a + regionsData[b].EWZ, 0);
					$('#LKlabel').html('France');
					$('#pop').html(totalPop.toLocaleString());

					['', '_90', '_180'].forEach(t => ['2', '3'].forEach(s => {
						total = Object.keys(regionsData).reduce((a,b) => a + regionsData[b]['dose' + s + t], 0);
						$('#dose' + s + t).html(total.toLocaleString());
						$('#coverage' + s + t).html((total / totalPop * 100).toLocaleString(undefined, {minimumFractionDigits: 3, maximumFractionDigits: 3}));
					}));
					$('.lastUpdated').html(vacFRA.lastUpdate.toISOString().substring(0,10));

					bgColor = mapStyle.coverage(Object.keys(regionsData).reduce((a,b) => a + regionsData[b].dose2, 0) / totalPop * 100);
				};

				regionChooser.listen('MDCTabBar:activated', detail => {
                    switch(detail.detail.index)
					{
						case 0: fxDepartement(); break;
						case 1: fxRegion(); break;
						case 2: fxRepublique(); break;
					}
                    resetTableColours(bgColor);
				});

				fxDepartement();
				resetTableColours(bgColor);
				displayTable('Department', 'Region', 0);
			}
		});
	},

	showOnMap: () => {
		DepartementJSON.removeEventListener('add', layerLoaded);
		map.removeLayer(DepartementJSON);
		DepartementJSON = L.geoJSON(Departements, {
			style: feature => mapStyle.style(feature.properties.dose2 / feature.properties.EWZ * 100, 'coverage'),
			onEachFeature: vacFRA.handleClick
		});
		DepartementJSON.addEventListener('add', layerLoaded);
		DepartementJSON.addTo(map);
	},

	pullVaccineData: () => {
		Object.keys(regionsData).forEach(L_k => Object.assign(regionsData[L_k], {
			dose2_90: 0, dose2_180: 0, dose2: 0,
			dose3_90: 0, dose3_180: 0, dose3: 0
		}));

		$.get('https://www.data.gouv.fr/fr/datasets/r/4f39ec91-80d7-4602-befb-4b522804c0af').done(data => {
			data = preprocessCSVFRA(data);
			workbook = readCSV(data, ';', false);
			workbook = workbook.filter(value => isNaN(value.dep) || value.dep < 100);
			workbook.sort((a,b) => {
				if (parseInt((isNaN(a.dep) ? a.dep: a.dep.toString(10)), 16) < parseInt((isNaN(b.dep) ? b.dep: b.dep.toString(10)), 16)) return -1;
				else if (parseInt((isNaN(a.dep) ? a.dep: a.dep.toString(10)), 16) > parseInt((isNaN(b.dep) ? b.dep: b.dep.toString(10)), 16)) return 1;
				else return b.jour < a.jour ? -1 : 1;
			});

			vacFRA.lastUpdate = convertDate.fx(workbook[0].jour);
			numberOfDays = workbook.length / 96;
			for (i = 0; i < 96; i++) {
				Departements.features[i].properties.dose2 = workbook[i * numberOfDays].n_cum_complet;
				Departements.features[i].properties.dose3 = workbook[i * numberOfDays].n_cum_rappel;
				[90, 180].forEach(t => {
					Departements.features[i].properties['dose2_' + t.toString(10)] = Departements.features[i].properties.dose2 - workbook[i * numberOfDays + t].n_cum_complet;
					Departements.features[i].properties['dose3_' + t.toString(10)] = Departements.features[i].properties.dose3 - workbook[i * numberOfDays + t].n_cum_rappel;
				});

				['', '_90', '_180'].forEach(s => ['2','3'].forEach(t => regionsData[Departements.features[i].properties.reg_code]['dose' + t + s] += Departements.features[i].properties['dose' + t + s]));
			}

			vacFRA.showOnMap();
		});
	},

	init: () => (Departements.features.reduce((a,b) => a || b.properties.dose2 === undefined, false)) ? vacFRA.pullVaccineData() : vacFRA.showOnMap()
};
