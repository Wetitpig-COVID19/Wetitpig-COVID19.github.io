var LuxembourgJSON;

casesFx.LUX = {
	handleClick: (feature, layer) => {
		layer.on({
			mouseover: e => e.target.setStyle(mapStyle.mouseover(feature.properties.cases7 / feature.properties.EWZ * 100000, 'incidence')),
			mouseout: e => LuxembourgJSON.resetStyle(e.target),
			click: () => {
				toPrint = feature.properties;
				$('#LKlabel').html(toPrint.name);
				casesTableFill(toPrint);
				$('.lastUpdated').html(toPrint.lastUpdate.cases);

				bgColor = mapStyle.incidence(toPrint.cases7 / toPrint.EWZ * 100000);
				resetTableColours(bgColor);
				displayTable('Country', 'Country', 0);
				$('#regionChooser #mdc-tab-2, #regionChooser #mdc-tab-3').prop('disabled', true);
			}
		});
	},

	showOnMap: () => {
		if (LuxembourgJSON !== undefined)
			map.removeLayer(LuxembourgJSON)
		LuxembourgJSON = L.geoJSON(Luxembourg, {
			style: feature => mapStyle.style(feature.properties.cases7 / feature.properties.EWZ * 100000, 'incidence'),
			onEachFeature: casesFx.LUX.handleClick
		});
		LuxembourgJSON.addTo(map);
	}
};

vacFx.LUX = {
	handleClick: (feature, layer) => {
		layer.on({
			mouseover: e => e.target.setStyle(mapStyle.mouseover(feature.properties.dose2 / feature.properties.EWZ * 100, 'coverage')),
			mouseout: e => LuxembourgJSON.resetStyle(e.target),
			click: () => {
				toPrint = feature.properties;
				$('#LKlabel').html(toPrint.name);
				vacTableFill(toPrint);
				$('.lastUpdated').html(toPrint.lastUpdate.vac);

				bgColor = mapStyle.coverage(toPrint.dose2 / toPrint.EWZ * 100);
				resetTableColours(bgColor);
				displayTable('Country', 'Country', 0);
				$('#regionChooser #mdc-tab-2, #regionChooser #mdc-tab-3').prop('disabled', true);
			}
		});
	},

	showOnMap: () => {
		if (LuxembourgJSON !== undefined)
			map.removeLayer(LuxembourgJSON)
		LuxembourgJSON = L.geoJSON(Luxembourg, {
			style: feature => mapStyle.style(feature.properties.dose2 / feature.properties.EWZ * 100, 'coverage'),
			onEachFeature: vacFx.LUX.handleClick
		});
		LuxembourgJSON.addTo(map);
	}
};

pullFx.LUX = async () => {
	[Luxembourg, result] = await downloadMapJSON('LUX');
	Object.assign(Luxembourg.features[0].properties, result);
};
