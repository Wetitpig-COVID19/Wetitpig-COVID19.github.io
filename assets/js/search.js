const nonAscii = new RegExp(/[^\x00-\x7F]+/g);
const replaceNonAscii = string => string.normalize('NFD').replace(nonAscii, '');

const FuseGeoJSON = (geoJSON, key) => {
	var listToSearch = Object.keys(geoJSON._layers).reduce((a,b) => {
		a.push(geoJSON._layers[b]);
		return a;
	}, []);
	listToSearch.forEach(item => item.feature.properties[key + '_normalized'] = replaceNonAscii(item.feature.properties[key]));
	return new Fuse(listToSearch, {
		includeScore: true,
		ignoreFieldNorm: true,
		keys: [`feature.properties.${key}_normalized`]
	});
};

var nonExactBar;
var searchBox;
var hintMenu;

$(() => document.querySelector('.mdc-linear-progress').addEventListener('COVID19:Loaded', () => {
	const hintListL1 = new Fuse(
		['Deutschland', 'Germany', 'Osterreich', 'Austria', 'Italia', 'Italy', 'France', 'Die Schweiz', 'La Suisse', 'La Svizzera', 'La Svizra', 'Switzerland'], {
		includeScore: true
	});

	const hintListL2 = {
		DEU: FuseGeoJSON(LandkreisJSON, 'BL'),
		FRA: FuseGeoJSON(DepartementJSON, 'reg'),
		ITA: FuseGeoJSON(ProvinceJSON, 'reg_name'),
		AUT: FuseGeoJSON(BezirkJSON, 'BL')
	};

	const hintListL3 = {
		DEU: FuseGeoJSON(LandkreisJSON, 'BEZ_GEN'),
		FRA: FuseGeoJSON(DepartementJSON, 'nom'),
		ITA: FuseGeoJSON(ProvinceJSON, 'prov_name'),
		AUT: FuseGeoJSON(BezirkJSON, 'name'),
		CHE: FuseGeoJSON(KantonJSON, 'KTNAME')
	};
	var hintListItems;
	var pooledSearch;
	var searchResult;

	const search = value => {
		{
			res = hintListL1.search(value);
			if (res.length)
				searchResult = [{
				level: 1,
				result: res
			}];
			else
				searchResult = [];
		}
		$.each(hintListL2, (key, list) => {
			res = list.search(value);
			if (res.length) {
				res.sort((item1, item2) => item1.score - item2.score);
				searchResult.push({
					country: key,
					level: 2,
					result: res
				});
			}
		});
		$.each(hintListL3, (key, list) => {
			res = list.search(value);
			if (res.length) {
				res.sort((item1, item2) => item1.score - item2.score);
				searchResult.push({
					country: key,
					level: 3,
					result: res
				});
			}
		});
		return searchResult;
	}

	const suggest = value => {
		if (value) {
			var searchResult = search(value);
			pooledSearch = searchResult.reduce((aggregate, list) => {
				aggregate.push(...list.result.map(item => ({
					level: list.level,
					country: list.country,
					result: item
				})));
				return aggregate;
			}, []);
			pooledSearch.sort((item1, item2) => item1.result.score - item2.result.score);

			var filledItems = 0; var searchIndex = 0;
			while (filledItems < 8 && searchIndex < pooledSearch.length) {
				if (pooledSearch[searchIndex].level == 1) {
					labelString = pooledSearch[searchIndex].result.item;
					if (labelString == 'Osterreich')
						labelString = 'Österreich';
				}
				else {
					switch(pooledSearch[searchIndex].country)
					{
						case 'DEU': label = ['Deutschland', 'BL', 'BEZ_GEN']; break;
						case 'FRA': label = ['France', 'reg', 'nom']; break;
						case 'ITA': label = ['Italia', 'reg_name', 'prov_name']; break;
						case 'AUT': label = ['Österreich', 'BL', 'name']; break;
						default: label = ['Schweiz/Suisse/Svizzera/Svizra', 'GRNR', 'KTNAME']; break;
					}
					labelString = (pooledSearch[searchIndex].level == 3) ? pooledSearch[searchIndex].result.item.feature.properties[label[2]] + ', ' : '';
					if (labelString != 'Liechtenstein, ') {
						if (pooledSearch[searchIndex].country == 'CHE')
							labelString += 'Grossregion '
						labelString += pooledSearch[searchIndex].result.item.feature.properties[label[1]];
						labelString += ', ' + label[0];
					}
					else
						labelString = labelString.slice(0, -2);
				}

				if (Array.from(hintListItems).slice(0, filledItems).reduce((a,b) => a && b.innerHTML != labelString, true)) {
					hintListItems[filledItems].innerHTML = labelString;
					filledItems++;
				}
				searchIndex++;
			}
			hintMenu.open = true;
		}
		else
			hintMenu.open = false;
	};

	const activate = value => {
		if (value !== '') {
			var bestMatch = {};
			if (typeof(value) == 'string') {
				var searchResult = search(value);
				console.log(searchResult);

				bestMatch = searchResult.reduce((a,b) => {
					if (a.result[0].score < b.result[0].score) return a;
					else if (a.result[0].score > b.result[0].score) return b;
					else return a.level < b.level ? a : b;
				}, {
					level: 4,
					result: [{score: 1}]
				});
			}
			else {
				Object.assign(bestMatch, pooledSearch[value]);
				bestMatch.result = [bestMatch.result];
			}

			hintMenu.open = false;
			console.log(bestMatch);
			if (bestMatch.level != 1)
				bestMatch.result[0].item.fireEvent('click');
			else  {
				var toFire;
				switch (bestMatch.result[0].item)
				{
					case 'Deutschland': case 'Germany': toFire = LandkreisJSON; break;
					case 'Osterreich': case 'Austria': toFire = BezirkJSON; break;
					case 'Italia': case 'Italy': toFire = ProvinceJSON; break;
					case 'France': toFire = DepartementJSON; break;
					default: toFire = KantonJSON; break;
				}
				toFire._layers[Object.keys(toFire._layers)[0]].fireEvent('click');
			}
			if (bestMatch.level != 3)
				regionChooser.activateTab(3 - bestMatch.level);

			if (replaceNonAscii($('#LKlabel').html()) != replaceNonAscii(document.querySelector('#searchName input').value)) {
				nonExactBar.labelText = `No exact match of "${value}" found. Showing results for "${$('#LKlabel').html()}"`;
				nonExactBar.open();
			}
		}
	};

	searchBox = new mdc.textField.MDCTextField(document.querySelector('#searchName label'));
	document.querySelector('#searchName input').addEventListener('keyup', event => {
		if (event.keyCode === 13)
			activate(event.target.value);
		else
			suggest(event.target.value);
	});
	document.querySelector('#searchName input').disabled = false;

	nonExactBar = mdc.snackbar.MDCSnackbar.attachTo(document.getElementById('nonexact-match'));
	nonExactBar.timeoutMs = 4000;

	hintMenu = mdc.menu.MDCMenu.attachTo(document.querySelector('#searchNameHint'));
	hintListItems = document.querySelectorAll('#searchNameHint .mdc-list-item__text');
	const hintListRipples = hintMenu.items.map(el => new mdc.ripple.MDCRipple(el));
	hintMenu.setDefaultFocusState(mdc.menu.DefaultFocusState.NONE);
	hintMenu.setAnchorCorner(mdc.menuSurface.Corner.BOTTOM_START);
	document.querySelector('#searchNameHint').addEventListener('MDCMenu:selected', event => {
		hintMenu.open = false;
		document.querySelector('#searchName input').value = hintListItems[event.detail.index].innerHTML.split(',')[0];
		activate(event.detail.index);
	});
}));
