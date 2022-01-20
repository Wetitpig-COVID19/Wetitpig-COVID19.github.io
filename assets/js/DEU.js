var LandkreisJSON;
var bundeslaenderDataDEU;

const casesDEU = {
	lastUpdate: null,
	landkreisFiltered: null,

	handleClick: (feature, layer) => {
		layer.on({
			mouseover: e => e.target.setStyle(mapStyle.mouseover(feature.properties.cases7_per_100k, 'incidence')),
			mouseout: e => LandkreisJSON.resetStyle(e.target),
			click: _e => {
				var fxKreis = () => {
					toPrint = feature.properties;
					$('#LKlabel').html(toPrint.BEZ_GEN);
					casesTableFill(toPrint);
					$('.lastUpdated').html(casesDEU.lastUpdate.toISOString().substring(0,10));
					bgColor = mapStyle.incidence(toPrint.cases7_per_100k);
				};

				var fxLand = () => {
					toPrint = bundeslaenderDataDEU[parseInt(feature.properties['BL_ID'], 10) - 1];
					$('#LKlabel').html(feature.properties.BL);
					casesTableFill(toPrint);
					$('.lastUpdated').html(casesDEU.lastUpdate.toISOString().substring(0,10));
					bgColor = mapStyle.incidence(toPrint.cases7 / toPrint.EWZ * 100000);
				};

				var fxBund = () => {
					totalPop = bundeslaenderDataDEU.reduce((a,b) => a + b.EWZ, 0);
					$('#LKlabel').html('Deutschland');
					$('#pop').html(totalPop.toLocaleString());

					['7','14','28'].forEach(s => {
						[['cases', 'incidence'], ['deaths', 'mortality']].forEach(t => {
							total = bundeslaenderDataDEU.reduce((a,b) => a + b[t[0] + s], 0);
							$('#' + t[0] + s).html(total.toLocaleString());
							$('#' + t[1] + s).html((total / totalPop * 100000).toLocaleString(undefined, {minimumFractionDigits: 3, maximumFractionDigits: 3}));
						});
					});
					$('.lastUpdated').html(casesDEU.lastUpdate.toISOString().substring(0,10));

					bgColor = mapStyle.incidence(bundeslaenderDataDEU.reduce((a,b) => a + b.cases7, 0) / totalPop * 100000);
				};

				regionChooser.listen('MDCTabBar:activated', detail => {
					switch(detail.detail.index)
					{
						case 0: fxKreis(); break;
						case 1: fxLand(); break;
						case 2: fxBund(); break;
					}
					resetTableColours(bgColor);
				});

				fxKreis();
				resetTableColours(bgColor);
				displayTable('County', 'State', 0);
			}
		});
	},

	showOnMap: () => {
		if (LandkreisJSON !== undefined) {
			LandkreisJSON.removeEventListener('add', layerLoaded);
			map.removeLayer(LandkreisJSON)
		}
		LandkreisJSON = L.geoJSON({
			type: Landkreise.type,
			crs: Landkreise.crs,
			features: casesDEU.landkreisFiltered
		}, {
			style: feature => mapStyle.style(feature.properties.cases7_per_100k, 'incidence'),
			onEachFeature: casesDEU.handleClick
		});
		LandkreisJSON.addEventListener('add', layerLoaded);
		LandkreisJSON.addTo(map);
	},

	pullEpidemiologicalData: () => {
		Landkreise.features.sort((item1, item2) => parseInt(item1.properties.RS, 10) - parseInt(item2.properties.RS, 10));
		casesDEU.landkreisFiltered = Landkreise.features.filter(value => value.properties.RS != '11000');
		Landkreise.features.forEach(L_v => L_v.properties.BEZ_GEN = L_v.properties.BEZ + ' ' + L_v.properties.GEN);

		var queries = [];
		queries.push($.getJSON({
			url: 'https://services7.arcgis.com/mOBPykOjAyBO2ZKk/arcgis/rest/services/RKI_Landkreisdaten/FeatureServer/0/query',
			data: {
				where: '1=1',
				orderByFields: 'RS ASC',
				outFields: 'EWZ,RS,cases7_per_100k',
				returnGeometry: false,
				f: 'json'
			}
		}).done(data => {
			for (var i = 0; i < data.features.length; i++) {
				$.extend(true, casesDEU.landkreisFiltered[i].properties, data.features[i].attributes);
				Object.assign(casesDEU.landkreisFiltered[i].properties, {
					cases7: 0, cases14: 0, cases28: 0,
					deaths7: 0, deaths14: 0, deaths28: 0
				});
			}
			Landkreise.features.filter(value => value.properties.RS == '11000')[0].properties.EWZ = casesDEU.landkreisFiltered.filter(value => value.properties.RS.substring(0,2) == '11').reduce((a,b) => a + b.properties.EWZ, 0);
		}));

		$.getJSON({
			url: 'https://services7.arcgis.com/mOBPykOjAyBO2ZKk/arcgis/rest/services/rki_data_status_v/FeatureServer/0/query',
			data: {
				where: '1=1',
				outFields: '*',
				f: 'json'
			}
		}).done(data => {
			casesDEU.lastUpdate = new Date(data.features[0].attributes.Datum);
			casesDEU.lastUpdate.setTime(casesDEU.lastUpdate.getTime() - 23 * 60 * 60 * 1000);

			[7, 14, 28].forEach(t => {
				daysFromNow = [
					new Date(casesDEU.lastUpdate.getTime() - (t - 1) * 86400000),
					new Date(casesDEU.lastUpdate.getTime())
				];
				queries.push(
					$.getJSON({
						url: 'https://services7.arcgis.com/mOBPykOjAyBO2ZKk/arcgis/rest/services/RKI_COVID19/FeatureServer/0/query',
						data: {
							where: `(Meldedatum BETWEEN DATE \'${daysFromNow[0].toISOString().substring(0,10)}\' AND DATE \'${daysFromNow[1].toISOString().substring(0,10)}\')`,
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
					}).done(data => {
						for (i = 0; i < data.features.length; i++) {
							casesDEU.landkreisFiltered[i].properties['cases' + t.toString(10)] = data.features[i].attributes.AnzahlFall_S;
							casesDEU.landkreisFiltered[i].properties['deaths' + t.toString(10)] = data.features[i].attributes.AnzahlTodesfall_S;
						}
					})
				)
			});

			$.when(...queries).done(() => {
				bundeslaenderDataDEU = new Array(16).fill(null).map(() => ({
					cases7: 0, cases14: 0, cases28: 0,
					deaths7: 0, deaths14: 0, deaths28: 0,
					EWZ: 0
				}));
				casesDEU.landkreisFiltered.forEach(L_v => {
					['cases','deaths'].forEach(s => ['7', '14', '28'].forEach(t => bundeslaenderDataDEU[parseInt(L_v.properties['BL_ID'], 10) - 1][s + t] += L_v.properties[s + t]));
					bundeslaenderDataDEU[parseInt(L_v.properties['BL_ID'], 10) - 1].EWZ += L_v.properties.EWZ;
				});

				casesDEU.showOnMap();
			});
		});
	},

	init: () => ((Landkreise.features.filter(value => value.properties.RS != '11000').reduce((a,b) => a || b.properties.cases7_per_100k === undefined, false)) ? casesDEU.pullEpidemiologicalData() : casesDEU.showOnMap())
};


const vacDEU = {
	lastUpdate: null,
	bundData: {
		dose2_90: 0, dose2_180: 0, dose2: 0,
		dose3_90: 0, dose3_180: 0, dose3: 0
	},
	landkreisFiltered: null,

	handleClick: (feature, layer) => {
		layer.on({
			mouseover: e => e.target.setStyle(mapStyle.mouseover(feature.properties.dose2 / feature.properties.EWZ * 100, 'coverage')),
			mouseout: e => LandkreisJSON.resetStyle(e.target),
			click: _e => {
				var fxKreis = () => {
					toPrint = feature.properties;
					$('#LKlabel').html(toPrint.BEZ + ' ' + toPrint.GEN);
					vacTableFill(toPrint);
					$('.lastUpdated').html(vacDEU.lastUpdate.toISOString().substring(0,10));

					bgColor = mapStyle.coverage(toPrint.dose2 / toPrint.EWZ * 100);
				};

				var fxLand = () => {
					toPrint = bundeslaenderDataDEU[parseInt(feature.properties['BL_ID'], 10) - 1];
					$('#LKlabel').html(feature.properties.BL);
					vacTableFill(toPrint);
					$('.lastUpdated').html(vacDEU.lastUpdate.toISOString().substring(0,10));

					bgColor = mapStyle.coverage(toPrint.dose2 / toPrint.EWZ * 100);
				};

				var fxBund = () => {
					totalPop = bundeslaenderDataDEU.reduce((a,b) => a + b.EWZ, 0);
					$('#LKlabel').html('Deutschland');
					$('#pop').html(totalPop.toLocaleString());

					['', '_90', '_180'].forEach(t => ['2', '3'].forEach(s => {
						total = [vacDEU.bundData, ...bundeslaenderDataDEU].reduce((a,b) => a + b['dose' + s + t], 0);
						$('#dose' + s + t).html(total.toLocaleString());
						$('#coverage' + s + t).html((total / totalPop * 100).toLocaleString(undefined, {minimumFractionDigits: 3, maximumFractionDigits: 3}));
					}));
					$('.lastUpdated').html(vacDEU.lastUpdate.toISOString().substring(0,10));

					bgColor = mapStyle.coverage([vacDEU.bundData, ...bundeslaenderDataDEU].reduce((a,b) => a + b.dose2, 0) / totalPop * 100);
				};

				regionChooser.listen('MDCTabBar:activated', detail => {
					switch(detail.detail.index)
					{
						case 0: fxKreis(); break;
						case 1: fxLand(); break;
						case 2: fxBund(); break;
					}
					resetTableColours(bgColor);
				});

				fxKreis();
				resetTableColours(bgColor);
				displayTable('County', 'State', 0);
			}
		});
	},

	showOnMap: () => {
		if (LandkreisJSON !== undefined) {
			LandkreisJSON.removeEventListener('add', layerLoaded);
			map.removeLayer(LandkreisJSON)
		}
		LandkreisJSON = L.geoJSON({
			type: Landkreise.type,
			crs: Landkreise.crs,
			features: vacDEU.landkreisFiltered
		}, {
			style: feature => mapStyle.style(feature.properties.dose2 / feature.properties.EWZ * 100, 'coverage'),
			onEachFeature: vacDEU.handleClick
		});
		LandkreisJSON.addEventListener('add', layerLoaded);
		LandkreisJSON.addTo(map);
	},

	pullVaccineData: () => {
		Landkreise.features.sort((item1, item2) => parseInt(item1.properties.RS, 10) - parseInt(item2.properties.RS, 10));
		vacDEU.landkreisFiltered = Landkreise.features.filter(value => value.properties.RS.substring(0,2) != '11' || value.properties.RS == '11000');
		bundeslaenderDataDEU.forEach(x =>
			Object.assign(x, {
				dose2_90: 0, dose2_180: 0, dose2: 0,
				dose3_90: 0, dose3_180: 0, dose3: 0
			})
		);

		$.get('https://raw.githubusercontent.com/robert-koch-institut/COVID-19-Impfungen_in_Deutschland/master/Aktuell_Deutschland_Landkreise_COVID-19-Impfungen.csv')
		.done(data => {
			workbook = readCSV(data);
			vacDEU.landkreisFiltered.forEach(L_v =>
				Object.assign(L_v.properties, {
					dose2_90: 0, dose2_180: 0, dose2: 0,
					dose3_90: 0, dose3_180: 0, dose3: 0
				})
			);

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
			vacDEU.lastUpdate = convertDate.fx(workbook.slice(-1)[0].Impfdatum);
			workbook.forEach(row => {
				key = 'dose' + row.Impfschutz.toString(10);
				switch (row.LandkreisId_Impfort)
				{
					case 16056:
						[90, 180].forEach(t => {
							if ((vacDEU.lastUpdate.getTime() - convertDate.fx(row.Impfdatum).getTime()) < 86400000 * t)
								vacDEU.landkreisFiltered[385].properties[key + '_' + t.toString(10)] += row.Anzahl;
						});
						vacDEU.landkreisFiltered[385].properties[key] += row.Anzahl;
						break;
					case 17000:
					case 'u':
						[90, 180].forEach(t => {
							if ((vacDEU.lastUpdate.getTime() - convertDate.fx(row.Impfdatum).getTime()) < 86400000 * t)
								vacDEU.bundData[key + '_' + t.toString(10)] += row.Anzahl;
						});
						vacDEU.bundData[key] += row.Anzahl;
						break;
					default:
						if (row.LandkreisId_Impfort != parseInt(vacDEU.landkreisFiltered[landkreisIndex].properties.RS, 10))
							landkreisIndex++;
						[90, 180].forEach(t => {
							if ((vacDEU.lastUpdate.getTime() - convertDate.fx(row.Impfdatum).getTime()) < 86400000 * t)
								vacDEU.landkreisFiltered[landkreisIndex].properties[key + '_' + t.toString(10)] += row.Anzahl;
						});
						vacDEU.landkreisFiltered[landkreisIndex].properties[key] += row.Anzahl;
						break;
				}
			});

			vacDEU.landkreisFiltered.forEach(L_v =>
				['', '_90', '_180'].forEach(s => ['2','3'].forEach(t =>
					bundeslaenderDataDEU[parseInt(L_v.properties['BL_ID'], 10) - 1]['dose' + t + s] += L_v.properties['dose' + t + s]
				))
			);

			vacDEU.showOnMap();
		});
	},

	init: () => (Landkreise.features.filter(value => value.properties.RS.substring(0,2) != '11' || value.properties.RS == '11000').reduce((a,b) => a || b.properties.dose2 === undefined, false)) ? vacDEU.pullVaccineData() : vacDEU.showOnMap()
};
