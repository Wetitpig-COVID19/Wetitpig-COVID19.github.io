var Powiaty;
var PowiatJSON;
var wojewodztwoData;

casesFx.POL = {
	lastUpdate: null,

	handleClick: (feature, layer) => {
		layer.on({
			mouseover: e => e.target.setStyle(mapStyle.mouseover(feature.properties.cases7 / feature.properties.EWZ * 100000, 'incidence')),
			mouseout: e => PowiatJSON.resetStyle(e.target),
			click: () => {
				const fxPowiat = () => {
					toPrint = feature.properties;
					$('#LKlabel').html((toPrint.JPT_NAZWA_.charAt(0).toUpperCase() == toPrint.JPT_NAZWA_.charAt(0) ? '' : 'powiat ') + toPrint.JPT_NAZWA_);
					casesTableFill(toPrint);
					$('.lastUpdated').html(casesFx.POL.lastUpdate);
					bgColor = mapStyle.incidence(feature.properties.cases7 / toPrint.EWZ * 100000);
				};

				const fxWojewodztwo = () => {
					toPrint = wojewodztwoData[Math.floor(parseInt(feature.properties.JPT_KJ_I_1, 10) / 200) - 1];
					$('#LKlabel').html('województwo ' + feature.properties.WOJEWODZTWO);
					casesTableFill(toPrint);
					$('.lastUpdated').html(casesFx.POL.lastUpdate);
					bgColor = mapStyle.incidence(toPrint.cases7 / toPrint.EWZ * 100000);
				};

				const fxRzeczpospolita = () => {
					$('#LKlabel').html('Polska');
					casesTableFill(NUTS1Data.PL);
					$('.lastUpdated').html(casesFx.POL.lastUpdate);
					bgColor = mapStyle.incidence(NUTS1Data.PL.cases7 / NUTS1Data.PL.EWZ * 100000);
				};

				regionChooser.listen('MDCTabBar:activated', detail => {
					switch(detail.detail.index)
					{
						case 0: fxPowiat(); break;
						case 1: fxWojewodztwo(); break;
						case 2: fxRzeczpospolita(); break;
					}
					resetTableColours(bgColor);
				});

				fxPowiat();
				resetTableColours(bgColor);
				displayTable('County', 'Voivodeship', 0);
			}
		});
	},

	showOnMap: () => {
		if (PowiatJSON !== undefined)
			map.removeLayer(PowiatJSON)
		PowiatJSON = L.geoJSON(Powiaty, {
			style: feature => mapStyle.style(feature.properties.cases7 / feature.properties.EWZ * 100000, 'incidence'),
			onEachFeature: casesFx.POL.handleClick
		});
		PowiatJSON.addTo(map);
		dataLoaded();
	}
};

vacFx.POL = {
	powLastUpdate: null,
	wojLastUpdate: null,
	globalLastUpdate: null,

	handleClick: (feature, layer) => {
		layer.on({
			mouseover: e => e.target.setStyle(mapStyle.mouseover(feature.properties.dose2 / feature.properties.EWZ * 100, 'coverage')),
			mouseout: e => PowiatJSON.resetStyle(e.target),
			click: () => {
				const fxPowiat = () => {
					toPrint = feature.properties;
					$('#LKlabel').html((toPrint.JPT_NAZWA_.charAt(0).toUpperCase() == toPrint.JPT_NAZWA_.charAt(0) ? '' : 'powiat ') + toPrint.JPT_NAZWA_);
					vacTableFill(toPrint);
					$('.lastUpdated').html(vacFx.POL.powLastUpdate);
					bgColor = mapStyle.coverage(toPrint.dose2 / toPrint.EWZ * 100);
				};

				const fxWojewodztwo = () => {
					toPrint = wojewodztwoData[Math.floor(parseInt(feature.properties.JPT_KJ_I_1, 10) / 200) - 1];
					$('#LKlabel').html('województwo ' + feature.properties.WOJEWODZTWO);
					vacTableFill(toPrint);
					$('.lastUpdated').html(vacFx.POL.wojLastUpdate);
					bgColor = mapStyle.coverage(toPrint.dose2 / toPrint.EWZ * 100);
				};

				const fxRzeczpospolita = () => {
					$('#LKlabel').html('Polska');
					vacTableFill(NUTS1Data.PL);
					$('.lastUpdated').html(vacFx.POL.globalLastUpdate);
					bgColor = mapStyle.coverage(NUTS1Data.PL.dose2 / NUTS1Data.PL.EWZ * 100);
				};

				regionChooser.listen('MDCTabBar:activated', detail => {
					switch(detail.detail.index)
					{
						case 0: fxPowiat(); break;
						case 1: fxWojewodztwo(); break;
						case 2: fxRzeczpospolita(); break;
					}
					resetTableColours(bgColor);
				});

				fxPowiat();
				resetTableColours(bgColor);
				displayTable('County', 'State', 0);
			}
		});
	},

	showOnMap: () => {
		if (PowiatJSON !== undefined)
			map.removeLayer(PowiatJSON)
		PowiatJSON = L.geoJSON(Powiaty, {
			style: feature => mapStyle.style(feature.properties.dose2 / feature.properties.EWZ * 100, 'coverage'),
			onEachFeature: vacFx.POL.handleClick
		});
		PowiatJSON.addTo(map);
		dataLoaded();
	}
};

pullFx.POL = async () => {
	[Powiaty, result] = await downloadMapJSON('POL');
	wojewodztwoData = result.NUTS2;
	Powiaty.features.forEach((Lk, index) => {
		Object.assign(Lk.properties, result.NUTS3[index]);
		wojewodztwoData[Math.floor(parseInt(Lk.properties.JPT_KJ_I_1, 10) / 200) - 1].EWZ += Lk.properties.EWZ;
	});
	NUTS1Data.PL = result.NUTS1;
	NUTS1Data.PL.EWZ = wojewodztwoData.reduce((aggregate,woj) => aggregate + woj.EWZ, 0);

	casesFx.POL.lastUpdate = result.lastUpdate.cases;
	vacFx.POL.powLastUpdate = result.lastUpdate.pow;
	vacFx.POL.wojLastUpdate = result.lastUpdate.woj;
	vacFx.POL.globalLastUpdate = result.lastUpdate.rep;
};
