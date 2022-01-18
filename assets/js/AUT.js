var BezirkJSON;
var bundeslaenderDataAUT;

const casesAUT = {
    bundeslaenderData: [],
    lastUpdate: null,

    handleClick: (feature, layer) => {
        layer.on({
            mouseover: e => e.target.setStyle(mapStyle.mouseover(feature.properties.cases7 / feature.properties.EWZ * 100000, 'incidence')),
            mouseout: e => BezirkJSON.resetStyle(e.target),
            click: e => {
                var fxBezirk = () => {
					toPrint = feature.properties;
					$('#LKlabel').html(toPrint.name);
					casesTableFill(toPrint);
					$('.lastUpdated').html(casesAUT.lastUpdate.toISOString().substring(0,10));
					bgColor = mapStyle.incidence(feature.properties.cases7 / toPrint.EWZ * 100000);
				};

				var fxLand = () => {
					toPrint = bundeslaenderDataAUT[Math.floor(parseInt(feature.properties.iso, 10) / 100) - 1];
					$('#LKlabel').html(feature.properties.BL);
					casesTableFill(toPrint);
					$('.lastUpdated').html(casesAUT.lastUpdate.toISOString().substring(0,10));
					bgColor = mapStyle.incidence(toPrint.cases7 / toPrint.EWZ * 100000);
				};

				var fxBund = () => {
					totalPop = bundeslaenderDataAUT.reduce((a,b) => a + b.EWZ, 0);
					$('#LKlabel').html('Österreich');
					$('#pop').html(totalPop.toLocaleString());

					['7','14','28'].forEach(s => {
						[['cases', 'incidence'], ['deaths', 'mortality']].forEach(t => {
							total = bundeslaenderDataAUT.reduce((a,b) => a + b[t[0] + s], 0);
							$('#' + t[0] + s).html(total.toLocaleString());
							$('#' + t[1] + s).html((total / totalPop * 100000).toLocaleString(undefined, {minimumFractionDigits: 3, maximumFractionDigits: 3}));
						});
					});
					$('.lastUpdated').html(casesAUT.lastUpdate.toISOString().substring(0,10));
					bgColor = mapStyle.incidence(bundeslaenderDataAUT.reduce((a,b) => a + b.cases7, 0) / totalPop * 100000);
				};

                regionChooser.listen('MDCTabBar:activated', detail => {
                    switch(detail.detail.index)
                    {
                        case 0: fxBezirk(); break;
                        case 1: fxLand(); break;
                        case 2: fxBund(); break;
                    }
                    resetTableColours(bgColor);
				});

                fxBezirk();
                resetTableColours(bgColor);
                displayTable('District', 'State', 0);
            }
        });
    },

    init: () => {
        if (Bezirke.features.reduce((a,b) => a || b.properties.cases7 === undefined, false)) {
            bundeslaenderDataAUT = new Array(9).fill(null).map(() => ({
                cases7: 0, cases14: 0, cases28: 0,
                deaths7: 0, deaths14: 0, deaths28: 0,
                EWZ: 0
            }));
            Bezirke.features.forEach(L_v => {
				bundeslaenderDataAUT[Math.floor(parseInt(L_v.properties.iso, 10) / 100) - 1].EWZ += L_v.properties.EWZ;
				L_v.properties.BL = bundeslaenderNameAUT[Math.floor(parseInt(L_v.properties.iso, 10) / 100) - 1];
			});

            Bezirke.features.forEach(L_v =>
                [7, 14, 28].forEach(t => {
                    L_v.properties['cases' + t.toString(10)] = rxG.dsg[0].data.slice(-1)[0][L_v.properties.iso] - rxG.dsg[0].data.slice(-(t + 1), -t)[0][L_v.properties.iso];
                    L_v.properties['deaths' + t.toString(10)] = rxG.dsg[2].data.slice(-1)[0][L_v.properties.iso] - rxG.dsg[2].data.slice(-(t + 1), -t)[0][L_v.properties.iso];

                    bundeslaenderDataAUT[Math.floor(parseInt(L_v.properties.iso, 10) / 100) - 1]['cases' + t.toString(10)] += L_v.properties['cases' + t.toString(10)];
                    bundeslaenderDataAUT[Math.floor(parseInt(L_v.properties.iso, 10) / 100) - 1]['deaths' + t.toString(10)] += L_v.properties['deaths' + t.toString(10)];
                })
            );
            casesAUT.lastUpdate = rxG.dse[0].date.split(/[.,]+/);
            casesAUT.lastUpdate = new Date(Date.UTC(parseInt(casesAUT.lastUpdate[2], 10), parseInt(casesAUT.lastUpdate[1], 10) - 1, parseInt(casesAUT.lastUpdate[0], 10)));
        }

        BezirkJSON.removeEventListener('add', layerLoaded);
        map.removeLayer(BezirkJSON);
        BezirkJSON = L.geoJSON(Bezirke, {
            style: feature => mapStyle.style(feature.properties.cases7 / feature.properties.EWZ * 100000, 'incidence'),
            onEachFeature: casesAUT.handleClick
        });
        BezirkJSON.addEventListener('add', layerLoaded);
        BezirkJSON.addTo(map);
    }
};

const vacAUT = {
    lastUpdate: null,
	bundData: {
		dose2_90: 0, dose2_180: 0, dose2: 0,
		dose3_90: 0, dose3_180: 0, dose3: 0
	},

    handleClick: (feature, layer) => {
		layer.on({
			mouseover: e => e.target.setStyle(mapStyle.mouseover(feature.properties.dose2 / feature.properties.EWZ * 100, 'coverage')),
			mouseout: e => BezirkJSON.resetStyle(e.target),
			click: _e => {
				var fxBezirk = () => {
					toPrint = feature.properties;
					$('#LKlabel').html(toPrint.name);
                    $('#pop').html(toPrint.EWZ);

                    $('#vaccine-details .mdc-data-table__cell--numeric').html('N/A');
                    ['2','3'].forEach(t => {
                        $('#dose' + t).html(toPrint['dose' + t].toLocaleString());
					    $('#coverage' + t).html((toPrint['dose' + t] / toPrint.EWZ * 100).toLocaleString(undefined, {minimumFractionDigits: 3, maximumFractionDigits: 3}));
                    });
					$('.lastUpdated').html(vacAUT.lastUpdate.toISOString().substring(0,10));

					bgColor = mapStyle.coverage(toPrint.dose2 / toPrint.EWZ * 100);
				};

				var fxLand = () => {
					toPrint = bundeslaenderDataAUT[Math.floor(parseInt(feature.properties.iso, 10) / 100) - 1];
					$('#LKlabel').html(feature.properties.BL);
					vacTableFill(toPrint);
					$('.lastUpdated').html(vacAUT.lastUpdate.toISOString().substring(0,10));

					bgColor = mapStyle.coverage(toPrint.dose2 / toPrint.EWZ * 100);
				};

				var fxBund = () => {
					toPrint = vacAUT.bundData;
					$('#LKlabel').html('Österreich');
					vacTableFill(toPrint);
					$('.lastUpdated').html(vacAUT.lastUpdate.toISOString().substring(0,10));

					bgColor = mapStyle.coverage(toPrint.dose2 / toPrint.EWZ * 100);
				};

				regionChooser.listen('MDCTabBar:activated', detail => {
					switch(detail.detail.index)
					{
						case 0: fxBezirk(); break;
						case 1: fxLand(); break;
						case 2: fxBund(); break;
					}
					resetTableColours(bgColor);
				});

				fxBezirk();
				resetTableColours(bgColor);
				displayTable('County', 'State', 0);
			}
		});
	},

	showOnMap: () => {
		BezirkJSON.removeEventListener('add', layerLoaded);
		map.removeLayer(BezirkJSON);
		BezirkJSON = L.geoJSON(Bezirke, {
			style: feature => mapStyle.style(feature.properties.dose2 / feature.properties.EWZ * 100, 'coverage'),
			onEachFeature: vacAUT.handleClick
		});
		BezirkJSON.addEventListener('add', layerLoaded);
		BezirkJSON.addTo(map);
	},

	pullVaccineData: () => {
		bundeslaenderDataAUT.forEach(x => Object.assign(x, {
			dose2_90: 0, dose2_180: 0, dose2: 0,
			dose3_90: 0, dose3_180: 0, dose3: 0
		}));
		vacAUT.bundData.EWZ = bundeslaenderDataAUT.reduce((a,b) => a + b.EWZ, 0);

		var query = $.getJSON({
			url: 'https://jsonp.afeld.me/',
			data: {
				url: 'https://pipe.orf.at/corona-dashboard/data/COVID19_vaccination_doses_timeline--states.json'
			}
		}).done(data => {
			vacAUT.lastUpdate = convertDate.fx(data.slice(-1)[0].dateISO);
			dataOfConcern = data.slice(-11);
			['','_90','_180'].forEach(s => ['2','3'].forEach(t => {
				for (i = 1; i < 10; i++)
					bundeslaenderDataAUT[i - 1]['dose' + t + s] = dataOfConcern[i]['dose_' + t];
				vacAUT.bundData['dose' + t + s] = dataOfConcern[10]['dose_' + t];
			}));

			[90,180].forEach(x => {
				dataOfConcern = data.slice(-(x + 1) * 11, -x * 11);
				['2', '3'].forEach(t => {
					for (i = 1; i < 10; i++)
						bundeslaenderDataAUT[i - 1]['dose' + t + '_' + x.toString(10)] -= dataOfConcern[i]['dose_' + t];
					vacAUT.bundData['dose' + t + '_' + x.toString(10)] -= dataOfConcern[10]['dose_' + t];
				});
			});
		});

		Bezirke.features.slice(0, -1).forEach(L_v => Object.assign(L_v.properties, {
			dose2: rxG.dsg[11].data.slice(-1)[0][L_v.properties.iso],
			dose3: rxG.dsg[12].data.slice(-1)[0][L_v.properties.iso]
		}));
		Object.assign(Bezirke.features.slice(-1)[0].properties, {
			dose2: Object.keys(rxG.dsg[11].data.slice(-1)[0]).filter(value => value.charAt(0) == '9').reduce((a,b) => a + rxG.dsg[11].data.slice(-1)[0][b], 0),
			dose3: Object.keys(rxG.dsg[12].data.slice(-1)[0]).filter(value => value.charAt(0) == '9').reduce((a,b) => a + rxG.dsg[12].data.slice(-1)[0][b], 0)
		});

		$.when(query).done(vacAUT.showOnMap);
	},

	init: () => (Bezirke.features.reduce((a,b) => a || b.properties.dose2 === undefined, false)) ? vacAUT.pullVaccineData() : vacAUT.showOnMap()
};
