var Kraje;
var KrajJSON;
var regioneData;

casesFx.CZE = {
	lastUpdate: null,

	handleClick: (feature, layer) => {
		layer.on({
			mouseover: e => e.target.setStyle(mapStyle.mouseover(feature.properties.cases7 / feature.properties.EWZ * 100000, 'incidence')),
			mouseout: e => KrajJSON.resetStyle(e.target),
			click: () => {
				const fxKraj = () => {
					toPrint = feature.properties;
					$('#LKlabel').html(toPrint.name);
					casesTableFill(toPrint);
					$('.lastUpdated').html(casesFx.CZE.lastUpdate);
					bgColor = mapStyle.incidence(feature.properties.cases7 / toPrint.EWZ * 100000);
				};

				const fxRegion = () => {
					toPrint = regioneData[Math.floor(parseInt(feature.properties.id.slice(3), 10) / 10) - 1];
					$('#LKlabel').html(toPrint.name);
					casesTableFill(toPrint);
					$('.lastUpdated').html(casesFx.CZE.lastUpdate);
					bgColor = mapStyle.incidence(toPrint.cases7 / toPrint.EWZ * 100000);
				};

				const fxRepublika = () => {
					$('#LKlabel').html('Česko');
					casesTableFill(NUTS1Data.CZ);
					$('.lastUpdated').html(casesFx.CZE.lastUpdate);
					bgColor = mapStyle.incidence(NUTS1Data.CZ.cases7 / NUTS1Data.CZ.EWZ * 100000);
				};

				regionChooser.listen('MDCTabBar:activated', detail => {
					switch(detail.detail.index)
					{
						case 0: fxKraj(); break;
						case 1: fxRegion(); break;
						case 2: fxRepublika(); break;
					}
					resetTableColours(bgColor);
				});

				fxKraj();
				resetTableColours(bgColor);
				displayTable('Kraj', 'Region', 0);
			}
		});
	},

	showOnMap: () => {
		if (KrajJSON !== undefined)
			map.removeLayer(KrajJSON)
		KrajJSON = L.geoJSON(Kraje, {
			style: feature => mapStyle.style(feature.properties.cases7 / feature.properties.EWZ * 100000, 'incidence'),
			onEachFeature: casesFx.CZE.handleClick
		});
		KrajJSON.addTo(map);
		dataLoaded();
	}
};

vacFx.CZE = {
	lastUpdate: null,

	handleClick: (feature, layer) => {
		layer.on({
			mouseover: e => e.target.setStyle(mapStyle.mouseover(feature.properties.dose2 / feature.properties.EWZ * 100, 'coverage')),
			mouseout: e => KrajJSON.resetStyle(e.target),
			click: () => {
				const fxKraj = () => {
					toPrint = feature.properties;
					$('#LKlabel').html(toPrint.name);
					vacTableFill(toPrint);
					$('.lastUpdated').html(vacFx.CZE.lastUpdate);
					bgColor = mapStyle.coverage(toPrint.dose2 / toPrint.EWZ * 100);
				};

				const fxRegion = () => {
					toPrint = regioneData[Math.floor(parseInt(feature.properties.id.slice(3), 10) / 10) - 1];
					$('#LKlabel').html(toPrint.name);
					vacTableFill(toPrint);
					$('.lastUpdated').html(vacFx.CZE.lastUpdate);
					bgColor = mapStyle.coverage(toPrint.dose2 / toPrint.EWZ * 100);
				};

				const fxRepublika = () => {
					$('#LKlabel').html('Česko');
					vacTableFill(NUTS1Data.CZ);
					$('.lastUpdated').html(vacFx.CZE.lastUpdate);
					bgColor = mapStyle.coverage(NUTS1Data.CZ.dose2 / NUTS1Data.CZ.EWZ * 100);
				};

				regionChooser.listen('MDCTabBar:activated', detail => {
					switch(detail.detail.index)
					{
						case 0: fxKraj(); break;
						case 1: fxRegion(); break;
						case 2: fxRepublika(); break;
					}
					resetTableColours(bgColor);
				});

				fxKraj();
				resetTableColours(bgColor);
				displayTable('Kraj', 'Region', 0);
			}
		});
	},

	showOnMap: () => {
		if (KrajJSON !== undefined)
			map.removeLayer(KrajJSON)
		KrajJSON = L.geoJSON(Kraje, {
			style: feature => mapStyle.style(feature.properties.dose2 / feature.properties.EWZ * 100, 'coverage'),
			onEachFeature: vacFx.CZE.handleClick
		});
		KrajJSON.addTo(map);
		dataLoaded();
	}
};

pullFx.CZE = async () => {
	[Kraje, result] = await downloadMapJSON('CZE');
	regioneData = result.NUTS2;
	Kraje.features.forEach((Lk, index) => {
		Object.assign(Lk.properties, result.NUTS3[index]);
		regioneData[Math.floor(parseInt(Lk.properties.id.slice(3), 10) / 10) - 1].EWZ += Lk.properties.EWZ;
		Lk.properties.reg = regioneData[Math.floor(parseInt(Lk.properties.id.slice(3), 10) / 10) - 1].name;
	});
	NUTS1Data.CZ = result.NUTS1;
	NUTS1Data.CZ.EWZ = regioneData.reduce((aggregate,r) => aggregate + r.EWZ, 0);

	casesFx.CZE.lastUpdate = result.lastUpdate.cases;
	vacFx.CZE.lastUpdate = result.lastUpdate.vac;
};
