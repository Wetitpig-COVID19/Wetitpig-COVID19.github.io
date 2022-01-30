var Bezirke;
var BezirkJSON;
var bundeslaenderDataAUT;

casesFx.AUT = {
	handleClick: (feature, layer) => {
		layer.on({
			mouseover: e => e.target.setStyle(mapStyle.mouseover(feature.properties.cases7 / feature.properties.EWZ * 100000, 'incidence')),
			mouseout: e => BezirkJSON.resetStyle(e.target),
			click: e => {
				const fxBezirk = () => {
					toPrint = feature.properties;
					$('#LKlabel').html(toPrint.name);
					casesTableFill(toPrint);
					$('.lastUpdated').html(toPrint.lastUpdate.cases);
					bgColor = mapStyle.incidence(feature.properties.cases7 / toPrint.EWZ * 100000);
				};

				const fxLand = () => {
					toPrint = bundeslaenderDataAUT[Math.floor(parseInt(feature.properties.iso, 10) / 100) - 1];
					$('#LKlabel').html(feature.properties.BL);
					casesTableFill(toPrint);
					$('.lastUpdated').html(toPrint.lastUpdate.cases);
					bgColor = mapStyle.incidence(toPrint.cases7 / toPrint.EWZ * 100000);
				};

				const fxBund = () => {
					$('#LKlabel').html('Österreich');
					casesTableFill(NUTS1Data.AT);
					$('.lastUpdated').html(NUTS1Data.AT.lastUpdate.cases);
					bgColor = mapStyle.incidence(NUTS1Data.AT.cases7 / NUTS1Data.AT.EWZ * 100000);
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

	showOnMap: () => {
		if (BezirkJSON !== undefined)
			map.removeLayer(BezirkJSON)
		BezirkJSON = L.geoJSON(Bezirke, {
			style: feature => mapStyle.style(feature.properties.cases7 / feature.properties.EWZ * 100000, 'incidence'),
			onEachFeature: casesFx.AUT.handleClick
		});
		BezirkJSON.addTo(map);
		dataLoaded();
	}
};

vacFx.AUT = {
	handleClick: (feature, layer) => {
		layer.on({
			mouseover: e => e.target.setStyle(mapStyle.mouseover(feature.properties.dose2 / feature.properties.EWZ * 100, 'coverage')),
			mouseout: e => BezirkJSON.resetStyle(e.target),
			click: () => {
				const fxBezirk = () => {
					toPrint = feature.properties;
					$('#LKlabel').html(toPrint.name);
					$('#pop').html(toPrint.EWZ);

					$('#vaccine-details .mdc-data-table__cell--numeric').html('N/A');
					['2','3'].forEach(t => {
						$('#dose' + t).html(toPrint['dose' + t].toLocaleString());
						$('#coverage' + t).html((toPrint['dose' + t] / toPrint.EWZ * 100).toLocaleString(undefined, {minimumFractionDigits: 3, maximumFractionDigits: 3}));
					});
					$('.lastUpdated').html(toPrint.lastUpdate.vac);

					bgColor = mapStyle.coverage(toPrint.dose2 / toPrint.EWZ * 100);
				};

				const fxLand = () => {
					toPrint = bundeslaenderDataAUT[Math.floor(parseInt(feature.properties.iso, 10) / 100) - 1];
					$('#LKlabel').html(feature.properties.BL);
					vacTableFill(toPrint);
					$('.lastUpdated').html(toPrint.lastUpdate.vac);

					bgColor = mapStyle.coverage(toPrint.dose2 / toPrint.EWZ * 100);
				};

				const fxBund = () => {
					$('#LKlabel').html('Österreich');
					vacTableFill(NUTS1Data.AT);
					$('.lastUpdated').html(NUTS1Data.AT.lastUpdate.vac);

					bgColor = mapStyle.coverage(NUTS1Data.AT.dose2 / NUTS1Data.AT.EWZ * 100);
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
		if (BezirkJSON !== undefined)
			map.removeLayer(BezirkJSON)
		BezirkJSON = L.geoJSON(Bezirke, {
			style: feature => mapStyle.style(feature.properties.dose2 / feature.properties.EWZ * 100, 'coverage'),
			onEachFeature: vacFx.AUT.handleClick
		});
		BezirkJSON.addTo(map);
		dataLoaded();
	}
};

pullFx.AUT = async () => {
	[Bezirke, result] = await downloadMapJSON('AUT');
	bundeslaenderDataAUT = result.NUTS2;
	Bezirke.features.forEach((Lk, index) => {
		Object.assign(Lk.properties, result.NUTS3[index]);
		Lk.properties.BL = bundeslaenderDataAUT[Math.floor(Lk.properties.GKZ / 100) - 1].BL;
	});
	NUTS1Data.AT = result.NUTS1;
};
