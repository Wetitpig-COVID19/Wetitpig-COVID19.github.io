var ProvinceJSON;
var regioniData;

casesFx.ITA = {
	regLastUpdate: null,
	proLastUpdate: null,

	handleClick: (feature, layer) => {
		layer.on({
			mouseover: e => e.target.setStyle(mapStyle.mouseover(feature.properties.cases7 / feature.properties.EWZ * 100000, 'incidence')),
			mouseout: e => ProvinceJSON.resetStyle(e.target),
			click: () => {
				const fxProvince = () => {
					toPrint = feature.properties;
					$('#LKlabel').html(toPrint.prov_name);
					$('#pop').html(toPrint.EWZ.toLocaleString());

					['7','14','28'].forEach(s => {
						$('#cases' + s).html(toPrint['cases' + s].toLocaleString());
						$('#incidence' + s).html((toPrint['cases' + s] / toPrint.EWZ * 100000).toLocaleString(undefined, {minimumFractionDigits: 3, maximumFractionDigits: 3}));
						$('#deaths' + s + ', #mortality' + s).html('N/A');
					});
					$('.lastUpdated').html(casesFx.ITA.proLastUpdate);
					bgColor = mapStyle.incidence(toPrint.cases7 / toPrint.EWZ * 100000);
				};

				const fxRegione = () => {
					toPrint = regioniData[feature.properties.reg_istat_code_num - 1];
					$('#LKlabel').html(feature.properties.reg_name);
					casesTableFill(toPrint);
					$('.lastUpdated').html(casesFx.ITA.regLastUpdate);
					bgColor = mapStyle.incidence(toPrint.cases7 / toPrint.EWZ * 100000);
				};

				const fxRepubblica = () => {
					$('#LKlabel').html('Italia');
					casesTableFill(NUTS1Data.IT);

					$('.lastUpdated').html(casesFx.ITA.regLastUpdate);
					bgColor = mapStyle.incidence(NUTS1Data.IT.cases7 / NUTS1Data.IT.EWZ * 100000);
				};

				regionChooser.listen('MDCTabBar:activated', detail => {
					switch(detail.detail.index)
					{
						case 0: fxProvince(); break;
						case 1: fxRegione(); break;
						case 2: fxRepubblica(); break;
					}
					resetTableColours(bgColor);
				});

				fxProvince();
				resetTableColours(bgColor);
				displayTable('Province', 'Region', 0);
			}
		});
	},

	showOnMap: () => {
		if (ProvinceJSON !== undefined) {
			ProvinceJSON.removeEventListener('add', layerLoaded);
			map.removeLayer(ProvinceJSON)
		}
		ProvinceJSON = L.geoJSON(Province, {
			style: feature => mapStyle.style(feature.properties.cases7 / feature.properties.EWZ * 100000, 'incidence'),
			onEachFeature: casesFx.ITA.handleClick
		});
		ProvinceJSON.addEventListener('add', layerLoaded);
		ProvinceJSON.addTo(map);
	}
};

 vacFx.ITA = {
	lastUpdate: null,

	handleClick: (feature, layer) => {
		layer.on({
			mouseover: e => e.target.setStyle(mapStyle.mouseover((feature.properties.reg_istat_code_num == 4 ? feature.properties.dose2 / feature.properties.EWZ : regioniData[feature.properties.reg_istat_code_num - 1].dose2 / regioniData[feature.properties.reg_istat_code_num - 1].EWZ) * 100, 'coverage')),
			mouseout: e => ProvinceJSON.resetStyle(e.target),
			click: () => {
				const fxProvince = () => {
					toPrint = feature.properties;
					$('#LKlabel').html(toPrint.prov_name);
					toPrint.reg_istat_code_num == 4 ? vacTableFill(toPrint) : $('#vaccine-details .mdc-data-table__cell--numeric').html('N/A');
					$('.lastUpdated').html(vacFx.ITA.lastUpdate);

					bgColor = mapStyle.coverage((toPrint.reg_istat_code_num == 4 ? toPrint.dose2 / toPrint.EWZ : regioniData[toPrint.reg_istat_code_num - 1].dose2 / regioniData[toPrint.reg_istat_code_num - 1].EWZ) * 100);
				};

				const fxRegione = () => {
					toPrint = regioniData[feature.properties.reg_istat_code_num - 1];
					$('#LKlabel').html(feature.properties.reg_name);
					vacTableFill(toPrint);
					$('.lastUpdated').html(vacFx.ITA.lastUpdate);

					bgColor = mapStyle.coverage(toPrint.dose2 / toPrint.EWZ * 100);
				};

				const fxRepubblica = () => {
					$('#LKlabel').html('Italia');
					vacTableFill(NUTS1Data.IT);
					$('.lastUpdated').html(vacFx.ITA.lastUpdate);
					bgColor = mapStyle.coverage(NUTS1Data.IT.dose2 / NUTS1Data.IT.EWZ * 100);
				};

				regionChooser.listen('MDCTabBar:activated', detail => {
					switch(detail.detail.index)
					{
						case 0: fxProvince(); break;
						case 1: fxRegione(); break;
						case 2: fxRepubblica(); break;
					}
					resetTableColours(bgColor);
				});

				if (feature.properties.reg_istat_code_num == 4) {
					fxProvince();
					displayTable('Province', 'Region', 0);
				}
				else {
					fxRegione();
					displayTable('Province', 'Region', 1);
				}
				resetTableColours(bgColor);
			}
		});
	},

	showOnMap: () => {
		if (ProvinceJSON !== undefined) {
			ProvinceJSON.removeEventListener('add', layerLoaded);
			map.removeLayer(ProvinceJSON)
		}
		ProvinceJSON = L.geoJSON(Province, {
			style: feature => mapStyle.style((feature.properties.reg_istat_code_num == 4 ? feature.properties.dose2 / feature.properties.EWZ : regioniData[feature.properties.reg_istat_code_num - 1].dose2 / regioniData[feature.properties.reg_istat_code_num - 1].EWZ) * 100, 'coverage'),
			onEachFeature: vacFx.ITA.handleClick
		});
		ProvinceJSON.addEventListener('add', layerLoaded);
		ProvinceJSON.addTo(map);
	}
};

pullFx.ITA = async () => {
	[Province, result] = await downloadMapJSON('ITA');
	Province.features.sort((item1, item2) => item1.properties.prov_istat_code_num - item2.properties.prov_istat_code_num);
	regioniData = result.NUTS2;
	Province.features.forEach((Lk, index) => {
		Object.assign(Lk.properties, result.NUTS3[index]);
		regioniData[Lk.properties.reg_istat_code_num - 1].EWZ += Lk.properties.EWZ;
	});
	NUTS1Data.IT = result.NUTS1;
	NUTS1Data.IT.EWZ = regioniData.reduce((aggregate, R) => aggregate += R.EWZ, 0);

	casesFx.ITA.proLastUpdate = result.lastUpdate.pro;
	casesFx.ITA.regLastUpdate = result.lastUpdate.reg;
	vacFx.ITA.lastUpdate = result.lastUpdate.vac;
};
