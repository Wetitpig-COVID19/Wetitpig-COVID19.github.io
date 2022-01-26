var Kantone;
var KantonJSON;
var grossRegionenData;

const casesCHE = {
	handleClick: (feature, layer) => {
		layer.on({
			mouseover: e => e.target.setStyle(mapStyle.mouseover(feature.properties.cases7 / feature.properties.EWZ * 100000, 'incidence')),
			mouseout: e => KantonJSON.resetStyle(e.target),
			click: () => {
				var fxKanton = () => {
					toPrint = feature.properties;
					$('#LKlabel').html(toPrint.KTNAME);
					casesTableFill(toPrint);
					$('.lastUpdated').html(`Cases: ${toPrint.lastUpdate.cases}<br>Deaths: ${toPrint.lastUpdate.deaths}`);
					bgColor = mapStyle.incidence(toPrint.cases7 / toPrint.EWZ * 100000);
				};

				var fxRegion = () => {
					toPrint = grossRegionenData[feature.properties['GRNR'] - 1];
					$('#LKlabel').html(grossRegionenData[feature.properties['GRNR'] - 1].name);
					casesTableFill(toPrint);
					$('.lastUpdated').html(`Cases: ${toPrint.lastUpdate.cases}<br>Deaths: ${toPrint.lastUpdate.deaths}`);
					bgColor = mapStyle.incidence(toPrint.cases7 / toPrint.EWZ * 100000);
				};

				var fxBund = () => {
					$('#LKlabel').html('Die Schweiz / La Suisse / La Svizzera / La Svizra');
					casesTableFill(NUTS1Data.CH);
					$('.lastUpdated').html(`Cases: ${NUTS1Data.CH.lastUpdate.cases}<br>Deaths: ${NUTS1Data.CH.lastUpdate.deaths}`);
					bgColor = mapStyle.incidence(NUTS1Data.CH.cases7 / NUTS1Data.CH.EWZ * 100000);
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
					displayTable('Country', 'Country', 0);
					$('#regionChooser #mdc-tab-2, #regionChooser #mdc-tab-3').prop('disabled', true);
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
	}
};

const vacCHE = {
	handleClick: (feature, layer) => {
		layer.on({
			mouseover: e => e.target.setStyle(mapStyle.mouseover(feature.properties.dose2 / feature.properties.EWZ * 100, 'coverage')),
			mouseout: e => KantonJSON.resetStyle(e.target),
			click: () => {
				var fxKanton = () => {
					toPrint = feature.properties;
					$('#LKlabel').html(toPrint.KTNAME);
					vacTableFill(toPrint);
					$('.lastUpdated').html(toPrint.lastUpdate.vac);

					bgColor = mapStyle.coverage(toPrint.dose2 / toPrint.EWZ * 100);
				};

				var fxRegion = () => {
					toPrint = grossRegionenData[feature.properties['GRNR'] - 1];
					$('#LKlabel').html(grossRegionenData[feature.properties['GRNR'] - 1].name);
					vacTableFill(toPrint);
					$('.lastUpdated').html(toPrint.lastUpdate.vac);

					bgColor = mapStyle.coverage(toPrint.dose2 / toPrint.EWZ * 100);
				};

				var fxBund = () => {
					$('#LKlabel').html('Die Schweiz/La Suisse/La Svizzera/La Svizra');
					vacTableFill(NUTS1Data.CH);

					$('.lastUpdated').html(NUTS1Data.CH.lastUpdate.vac);

					bgColor = mapStyle.coverage(NUTS1Data.CH.dose2 / NUTS1Data.CH.EWZ * 100);
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
					displayTable('Country', 'Country', 0);
					$('#regionChooser #mdc-tab-2, #regionChooser #mdc-tab-3').prop('disabled', true);
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
	}
};

const pullCHE = async () => {
	[Kantone, result] = await downloadMapJSON('CHE');
	Kantone.features.sort((item1, item2) => item1.KTCODE < item2.KTCODE ? -1 : 1);
	Kantone.features.forEach((Lk, index) => Object.assign(Lk.properties, result.NUTS3[index]));
	grossRegionenData = result.NUTS2;
	NUTS1Data.CH = result.NUTS1;
};
