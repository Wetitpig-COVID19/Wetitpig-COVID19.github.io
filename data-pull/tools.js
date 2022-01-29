const Papa = require('papaparse');
const isoCountry = require('iso-3166-1');
const process = require('process');

const dateRegex = new RegExp(/^(\d{4})-(\d{2})-(\d{2})/);

const convertDate = (dateString, regex=dateRegex, reverse=false) => {
	dateArray = dateString.match(regex);
	return reverse ? new Date(Date.UTC(dateArray[3], parseInt(dateArray[2], 10) - 1, dateArray[1])) : new Date(Date.UTC(dateArray[1], parseInt(dateArray[2], 10) - 1, dateArray[3]));
};

const parseCSV = data => new Promise((complete, error) =>
	Papa.parse(data, {
		header: true,
		dynamicTyping: true,
		complete: results => complete(results.data),
		error: error,
		skipEmptyLines: true
	})
);

const validateCases = (arrayToCheck, timeFrame=true) => {
	if (arrayToCheck.length == 0)
		throw new Error(msgFlag(process.argv[1].slice(-6,-3)) + ' : Array is empty');

	if (arrayToCheck.some((value, index) => {
		trapped = ['7','14','28'].some(t => value['cases' + t] === undefined) || timeFrame ? (value.cases7 > value.cases14 || value.cases14 > value.cases28) : false;
		if (trapped)
			console.error({
				trapped: value,
				index: index
			});
		return trapped;
	}))
		throw new Error(msgFlag(process.argv[1].slice(-6,-3)) + ' : Invalid cases data');
};

const validateDeaths = (arrayToCheck, timeFrame=true) => {
	if (arrayToCheck.length == 0)
		throw new Error(msgFlag(process.argv[1].slice(-6,-3)) + ' : Array is empty');

	if (arrayToCheck.some((value, index) => {
		trapped = ['7','14','28'].some(t => value['deaths' + t] === undefined) || timeFrame ? (value.deaths7 > value.deaths14 || value.deaths14 > value.deaths28) : false;
		if (trapped)
		console.error({
			trapped: value,
			index: index
		});
		return trapped;
	}))
		throw new Error(msgFlag(process.argv[1].slice(-6,-3)) + ' : Invalid deaths data');
};

const validateVaccines = (arrayToCheck, timeFrame=true) => {
	if (arrayToCheck.length == 0)
		throw new Error(msgFlag(process.argv[1].slice(-6,-3)) + ' : Array is empty');

	if (timeFrame ?
		arrayToCheck.some(value => {
			trapped = ['dose2','dose3'].some(s => ['','_90','_180'].some(t => value[s + t] === undefined) || value[s + '_90'] > value[s + '_180'] || value[s + '_180'] > value[s]);
			if (trapped)
				console.error({
					trapped: value,
					index: index
				});
			return trapped;
		}) :
		arrayToCheck.some(value => {
			trapped = ['dose2','dose3'].some(s => value[s] === undefined);
			if (trapped)
				console.error({
					trapped: value,
					index: index
				});
			return trapped;
		})
	)
		throw new Error(msgFlag(process.argv[1].slice(-6,-3)) + ' : Invalid vaccine data');
};

const msgFlag = country => {
	var countryCode2 = isoCountry.whereAlpha3(country).alpha2;
	var countryFlag = String.fromCodePoint(...[...countryCode2.toUpperCase()].map(c => c.charCodeAt() + 0x1F1A5));
	return countryFlag;
};
const msgLog = msg => console.log(`${msgFlag(process.argv[1].slice(-6,-3))} : ${msg}`);
const msgInfo = msg => console.info(`${msgFlag(process.argv[1].slice(-6,-3))} : ${msg}`);

module.exports = {
	dateRegex: dateRegex,
	convertDate: convertDate,
	csvParse: parseCSV,
	msg: {
		log: msgLog,
		info: msgInfo
	},
	validate: {
		cases: validateCases,
		deaths: validateDeaths,
		vaccine: validateVaccines
	}
};
