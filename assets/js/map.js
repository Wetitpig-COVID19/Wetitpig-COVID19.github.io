var NUTS1Data = {};
var casesFx = {};
var vacFx = {};
var pullFx = {};

const numCountries = 6;

const downloadMapJSON = async country => await Promise.all(
	['maps','data'].map(dir =>
		(async code => {
			var response = await fetch(baseURL + `/assets/${dir}/${code}.json.zst`);
			response = await response.arrayBuffer();
			response = fzstd.decompress(new Uint8Array(response));
			response = new TextDecoder().decode(response);
			dataLoaded();
			return JSON.parse(response);
		})(country)
	)
);

const LightenDarkenColor = (colorCode, amount) => {
	colorCode = colorCode.slice(1);
	var num = parseInt(colorCode, 16);
	var r = (num >> 16) + amount;
	if (r > 255) {
		r = 255;
	} else if (r < 0) {
		r = 0;
	}
	var b = ((num >> 8) & 0x00FF) + amount;
	if (b > 255) {
		b = 255;
	} else if (b < 0) {
		b = 0;
	}
	var g = (num & 0x0000FF) + amount;
	if (g > 255) {
		g = 255;
	} else if (g < 0) {
		g = 0;
	}
	return '#' + (g | (b << 8) | (r << 16)).toString(16).padStart(6,'0');
}

const mapStyle = {
	incidence: value => {
		return value > 2000 ? '#311B92' :
		value > 1500 ? '#4527A0' :
		value > 1000 ? '#512DA8' :
		value > 750 ? '#5E35B1' :
		value > 500 ? '#673AB7' :
		value > 300 ? '#7E57C2' :
		value > 200 ? '#9575CD' :
		value > 100 ? '#B39DDB' :
		value > 50 ? '#D1C4E9' :
		'#EDE7F6'
	},
	coverage: value => {
		return value > 90 ? '#004D40' :
		value > 85 ? '#00695C' :
		value > 80 ? '#00796B' :
		value > 75 ? '#00897B' :
		value > 70 ? '#009688' :
		value > 60 ? '#26A69A' :
		value > 50 ? '#4DB6AC' :
		value > 40 ? '#80CBC4' :
		value > 30 ? '#B2DFDB' :
		'#E0F2F1'
	},
	style: function (value, schema) {
		baseColor = this[schema](value);
		return {
			fillColor: baseColor,
			weight: 2,
			fillOpacity: 0.7,
			opacity: 1,
			color: LightenDarkenColor(baseColor, -25)
		};
	},
	mouseover: function (value, schema) {
		baseColor = this[schema](value);
		return {
			fillColor: baseColor,
			weight: 4,
			fillOpacity: 0.9,
			opacity: 1,
			color: LightenDarkenColor(baseColor, -25)
		};
	}
};

const dataLoaded = () => {
	progressBar.progress = progressBar.foundation.getProgress() + 1 / (numCountries * 2);
	if (progressBar.foundation.getProgress() > 0.999) {
		setTimeout(() => progressBar.close(), 500);

		google.charts.load('current', {
			packages: ['table'],
			callback: drawLeaderboard
		});
	}
}

const setStyleonData = (stylesheet, unit, onclick=true) => {
	if (onclick) {
		cssSheet = document.createElement('link');
		cssSheet.setAttribute('rel', 'stylesheet');
		cssSheet.setAttribute('href', `assets/css/${stylesheet}.css`);
		elementBefore = document.getElementsByTagName('link')[6];
		elementBefore.after(cssSheet);
		elementBefore.remove();
		document.getElementById('LKlabel').removeAttribute('style');

		progressBar.open();
		progressBar.foundation.setProgress(0);
	}

	document.querySelector('#searchName input').disabled = true;

	$('#LKlabel').html(`Select an area to get ${stylesheet} data.`);
	$('#details thead tr:last-child th:last-child').html(unit);
	$('#details tbody').css('display', 'none');
	$('#details tr ~ tr, #details tbody tr, #regionChooser').css('visibility', 'hidden');
	$(`#${stylesheet}-details`).css('display', 'table-row-group');

	map.invalidateSize(false);
};

var topAppBar;
var progressBar;
var appDrawer; var navButtons;
var map;

$(() => {
	$('body').css('visibility', 'visible');

	map = L.map('map', {
		center: [46.5008882, 9.5898338],
		zoom: 6.5
	});

	const addOSM = () => {
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			maxZoom: 12,
			minZoom: 5,
			attribution: '©OpenStreetMap, ©CartoDB'
		}).addTo(map);
	};

	appDrawer = mdc.drawer.MDCDrawer.attachTo(document.querySelector('aside.mdc-drawer'));
	document.querySelector('aside.mdc-drawer').addEventListener('MDCDrawer:opened', _event => document.activeElement.blur());
	document.querySelector('aside.mdc-drawer .mdc-list').addEventListener('click', event => {
		appDrawer.open = false;
		document.activeElement.blur();
		navButtons.forEach(b => b.classList.remove('mdc-deprecated-list-item--activated'));
		event.target.classList.add('mdc-deprecated-list-item--activated');
	});
	document.querySelector('.mdc-drawer-app-content').addEventListener('click', () => appDrawer.open = false);

	topAppBar = mdc.topAppBar.MDCTopAppBar.attachTo(document.querySelector('.mdc-top-app-bar'));
	topAppBar.setScrollTarget(document.querySelector('.flex-container-row'));
	topAppBar.listen('MDCTopAppBar:nav', () => appDrawer.open = true);

	progressBar = new mdc.linearProgress.MDCLinearProgress(document.querySelector('.mdc-linear-progress'));
	progressBar.buffer = 1;

	navButtons = document.querySelectorAll('aside.mdc-drawer a');
	const navigationButtonRipple = new mdc.ripple.MDCRipple(document.querySelector('.mdc-top-app-bar__navigation-icon'));
	navigationButtonRipple.unbounded = true;
	navButtons[0].addEventListener('click', function() {
		gChartOptions = [{
			cases7: '7-day Incidence',
			cases14: '14-day Incidence',
			cases28: '28-day Incidence',
			deaths7: '7-day Mortality',
			deaths14: '14-day Mortality',
			deaths28: '28-day Mortality'
		}, 100000, 1];
		setStyleonData('cases', 'per ' + (100000).toLocaleString());
		Object.values(casesFx).forEach(x => x.showOnMap());
	});
	navButtons[1].addEventListener('click', function() {
		setStyleonData('vaccine', '(%)');
		gChartOptions = [{
			dose2_90: '90-day Full',
			dose2_180: '180-day Full',
			dose2: 'Cumulative Full',
			dose3_90: '90-day Boosted',
			dose3_180: '180-day Boosted',
			dose3: 'Cumulative Boosted'
		}, 100, 3];
		Object.values(vacFx).forEach(x => x.showOnMap());
	});

	regionChooser = mdc.tabBar.MDCTabBar.attachTo(document.querySelector('#regionChooser'));
	setStyleonData('cases', 'per ' + (100000).toLocaleString(), false);
	Promise.all(Object.values(pullFx).map(fx => fx())).then(() => Object.values(casesFx).forEach(x => x.showOnMap()));
	addOSM();
});
