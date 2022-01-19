var LuxembourgJSON;

var xhrOverride = new XMLHttpRequest();
xhrOverride.responseType = 'arraybuffer';

const casesLUX = {
	lastUpdate: null,

	handleClick: (feature, layer) => {
		layer.on({
			mouseover: e => e.target.setStyle(mapStyle.mouseover(feature.properties.cases7 / feature.properties.EWZ * 100000, 'incidence')),
			mouseout: e => LuxembourgJSON.resetStyle(e.target),
			click: _e => {
				toPrint = feature.properties;
				$('#LKlabel').html(toPrint.name);
				casesTableFill(toPrint);
				$('.lastUpdated').html(casesLUX.lastUpdate.toISOString().substring(0,10));

				bgColor = mapStyle.incidence(toPrint.cases7 / toPrint.EWZ * 100000);
				resetTableColours(bgColor);
				displayTable('Country', 'Country', 0);
				$('#regionChooser #mdc-tab-2, #regionChooser #mdc-tab-3').prop('disabled', true);
			}
		});
	},

	showOnMap: () => {
		if (LuxembourgJSON !== undefined) {
			LuxembourgJSON.removeEventListener('add', layerLoaded);
			map.removeLayer(LuxembourgJSON)
		}
		LuxembourgJSON = L.geoJSON(Luxembourg, {
			style: feature => mapStyle.style(feature.properties.cases7 / feature.properties.EWZ * 100000, 'incidence'),
			onEachFeature: casesLUX.handleClick
		});
		LuxembourgJSON.addEventListener('add', layerLoaded);
		LuxembourgJSON.addTo(map);
	},

	pullEpidemiologicalData: () => {
		Object.assign(Luxembourg.features[0].properties, {
			cases7: 0, cases14: 0, cases28: 0,
			deaths7: 0, deaths14: 0, deaths28: 0
		});

		$.ajax({
			url: 'https://corsproxy.winsto003.workers.dev/corsproxy/',
			method: 'GET',
			data: {
				apiurl: 'https://data.public.lu/en/datasets/r/32f94473-9a6d-4640-9b92-a5b019d38111'
			},
			xhr: function() {
				return xhrOverride;
			}
		}).then(data => {
			var workbook = XLSX.read(data, {
				type: 'binary'
			});
			var processedXLSX = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
				header: 1
			});

			[7, 14, 28].forEach(t => {
				Luxembourg.features[0].properties['cases' + t.toString(10)] = parseInt(processedXLSX.slice(-1)[0][6], 10) - parseInt(processedXLSX.slice(-(t + 1))[0][6], 10);
				Luxembourg.features[0].properties['deaths' + t.toString(10)] = parseInt(processedXLSX.slice(-1)[0][4], 10) - parseInt(processedXLSX.slice(-(t + 1))[0][4], 10);
			});

			casesLUX.lastUpdate = processedXLSX.slice(-1)[0][0].match(/^(\d{2})\/(\d{2})\/(\d{4})/);
			casesLUX.lastUpdate = new Date(casesLUX.lastUpdate[3], parseInt(casesLUX.lastUpdate[2], 10) - 1, casesLUX.lastUpdate[1]);

			casesLUX.showOnMap();
		});
	},

	init: () => (Luxembourg.features[0].properties.cases7 === undefined) ? casesLUX.pullEpidemiologicalData() : casesLUX.showOnMap()
};

const vacLUX = {
	lastUpdate: null,

	handleClick: (feature, layer) => {
		layer.on({
			mouseover: e => e.target.setStyle(mapStyle.mouseover(feature.properties.dose2 / feature.properties.EWZ * 100, 'coverage')),
			mouseout: e => LuxembourgJSON.resetStyle(e.target),
			click: _e => {
				toPrint = feature.properties;
				$('#LKlabel').html(toPrint.name);
				vacTableFill(toPrint);
				$('.lastUpdated').html(vacLUX.lastUpdate.toISOString().substring(0,10));

				bgColor = mapStyle.coverage(toPrint.dose2 / toPrint.EWZ * 100);
				resetTableColours(bgColor);
				displayTable('Country', 'Country', 0);
				$('#regionChooser #mdc-tab-2, #regionChooser #mdc-tab-3').prop('disabled', true);
			}
		});
	},

	showOnMap: () => {
		if (LuxembourgJSON !== undefined) {
			LuxembourgJSON.removeEventListener('add', layerLoaded);
			map.removeLayer(LuxembourgJSON)
		}
		LuxembourgJSON = L.geoJSON(Luxembourg, {
			style: feature => mapStyle.style(feature.properties.dose2 / feature.properties.EWZ * 100, 'coverage'),
			onEachFeature: vacLUX.handleClick
		});
		LuxembourgJSON.addEventListener('add', layerLoaded);
		LuxembourgJSON.addTo(map);
	},

	pullVaccineData: () => {
		Object.assign(Luxembourg.features[0].properties, {
			dose2_90: 0, dose2_180: 0, dose2: 0,
			dose3_90: 0, dose3_180: 0, dose3: 0
		});

		$.ajax({
			url: 'https://corsproxy.winsto003.workers.dev/corsproxy/',
			method: 'GET',
			data: {
				apiurl: 'https://data.public.lu/en/datasets/r/0699455e-03fd-497b-9898-776c6dc786e8'
			},
			xhr: function() {
				return xhrOverride;
			}
		}).then(data => {
			var workbook = XLSX.read(data, {
				type: 'binary'
			});
			var processedXLSX = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
				header: 1,
				raw: false
			});
			vacLUX.lastUpdate = convertDate.fx(processedXLSX.slice(-1)[0][0]);
			[90,180].forEach(x => [2, 3].forEach(t => Luxembourg.features[0].properties['dose' + t.toString(10) + '_' + x.toString(10)] = processedXLSX.slice(-x).reduce((a,b) => a + parseInt(b[t], 10), 0)));
			[2,3].forEach(t => Luxembourg.features[0].properties['dose' + t.toString(10)] = processedXLSX.slice(1).reduce((a,b) => a + parseInt(b[t], 10), 0));
			vacLUX.showOnMap();
		});
	},

	init: () => Luxembourg.features[0].properties.dose2 === undefined ? vacLUX.pullVaccineData() : vacLUX.showOnMap()
};
