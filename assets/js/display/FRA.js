var DepartementJSON;
var regionsData;

casesFx.FRA = {
	handleClick: (feature, layer) => {
		layer.on({
			mouseover: e => e.target.setStyle(mapStyle.mouseover(feature.properties.cases7 / feature.properties.EWZ * 100000, 'incidence')),
			mouseout: e => DepartementJSON.resetStyle(e.target),
			click: () => {
				const fxDepartement = () => {
					toPrint = feature.properties;
					$('#LKlabel').html(toPrint.nom);
					casesTableFill(toPrint);
					$('.lastUpdated').html(`Cases: ${toPrint.lastUpdate.cases}<br>Deaths: ${toPrint.lastUpdate.deaths}`);
					bgColor = mapStyle.incidence(toPrint.cases7 / toPrint.EWZ * 100000);
				};

				const fxRegion = () => {
					toPrint = regionsData[feature.properties.reg_code];
					$('#LKlabel').html(feature.properties.reg);
					casesTableFill(toPrint);
					$('.lastUpdated').html(`Cases: ${toPrint.lastUpdate.cases}<br>Deaths: ${toPrint.lastUpdate.deaths}`);
					bgColor = mapStyle.incidence(toPrint.cases7 / toPrint.EWZ * 100000);
				};

				const fxRepublique = () => {
					$('#LKlabel').html('France');
					casesTableFill(NUTS1Data.FR);

					$('.lastUpdated').html(`Cases: ${NUTS1Data.FR.lastUpdate.cases}<br>Deaths: ${NUTS1Data.FR.lastUpdate.deaths}`);
					bgColor = mapStyle.incidence(NUTS1Data.FR.cases7 / NUTS1Data.FR.EWZ * 100000);
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
		if (DepartementJSON !== undefined)
			map.removeLayer(DepartementJSON)
		DepartementJSON = L.geoJSON(Departements, {
			style: feature => mapStyle.style(feature.properties.cases7 / feature.properties.EWZ * 100000, 'incidence'),
			onEachFeature: casesFx.FRA.handleClick
		});
		DepartementJSON.addTo(map);
		dataLoaded();
	}
};

vacFx.FRA = {
	handleClick: (feature, layer) => {
		layer.on({
			mouseover: e => e.target.setStyle(mapStyle.mouseover(feature.properties.dose2 / feature.properties.EWZ * 100, 'coverage')),
			mouseout: e => DepartementJSON.resetStyle(e.target),
			click: () => {
				const fxDepartement = () => {
					toPrint = feature.properties;
					$('#LKlabel').html(toPrint.nom);
					vacTableFill(toPrint);
					$('.lastUpdated').html(toPrint.lastUpdate.vac);

					bgColor = mapStyle.coverage(toPrint.dose2 / toPrint.EWZ * 100);
				};

				const fxRegion = () => {
					toPrint = regionsData[feature.properties.reg_code];
					$('#LKlabel').html(feature.properties.reg);
					vacTableFill(toPrint);
					$('.lastUpdated').html(toPrint.lastUpdate.vac);

					bgColor = mapStyle.coverage(toPrint.dose2 / toPrint.EWZ * 100);
				};

				const fxRepublique = () => {
					$('#LKlabel').html('France');
					vacTableFill(NUTS1Data.FR);
					$('.lastUpdated').html(NUTS1Data.FR.lastUpdate.vac);

					bgColor = mapStyle.coverage(NUTS1Data.FR.dose2 / NUTS1Data.FR.EWZ * 100);
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
		if (DepartementJSON !== undefined)
			map.removeLayer(DepartementJSON)
		DepartementJSON = L.geoJSON(Departements, {
			style: feature => mapStyle.style(feature.properties.dose2 / feature.properties.EWZ * 100, 'coverage'),
			onEachFeature: vacFx.FRA.handleClick
		});
		DepartementJSON.addTo(map);
		dataLoaded();
	}
};

pullFx.FRA = async () => {
	[Departements, result] = await downloadMapJSON('FRA');
	Departements.features.sort((item1, item2) => parseInt((isNaN(item1.properties.dep) ? item1.properties.dep : item1.properties.dep.toString(10)), 16) - parseInt((isNaN(item2.properties.dep) ? item2.properties.dep : item2.properties.dep.toString(10)), 16));
	Departements.features.forEach((Lk, index) => Object.assign(Lk.properties, result.NUTS3[index]));
	regionsData = result.NUTS2;
	NUTS1Data.FR = result.NUTS1;
};
