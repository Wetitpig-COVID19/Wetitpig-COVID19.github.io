const axios = require('axios');
const Papa = require('papaparse');
const isoCountry = require('iso-3166-1');
const process = require('process');

const dateRegex = new RegExp(/^(\d{4})-(\d{2})-(\d{2})/);
const httpCompress = {
	'Accept-Encoding': 'gzip, compress, deflate'
};

const convertDate = (dateString, regex=dateRegex, reverse=false) => {
	dateArray = dateString.match(regex);
	return reverse ? new Date(Date.UTC(dateArray[3], dateArray[2] - 1, dateArray[1])) : new Date(Date.UTC(dateArray[1], dateArray[2] - 1, dateArray[3]));
};

const parseCSV = (data, date={ regex: dateRegex, reverse: false }) => {
	var workbook = [];
	Papa.parse(data, {
		header: true,
		dynamicTyping: false,
		step: row => {
			Object.keys(row.data).forEach(k => {
				if (row.data[k] === 'true' || row.data[k] === 'TRUE') row.data[k] = true;
				else if (row.data[k] === 'false' || row.data[k] === 'FALSE') row.data[k] = false;
				else if (!isNaN(row.data[k])) row.data[k] = +row.data[k];
				else if (date.regex.test(row.data[k])) row.data[k] = convertDate(row.data[k], date.regex, date.reverse);
			});
			workbook.push(row.data);
		},
		skipEmptyLines: true
	});
	return workbook;
};

const pullCSV = async (url, date={ regex: dateRegex, reverse: false }) => await parseCSV(
	(await axios.get(url, {
		headers: httpCompress,
		responseType: 'text'
	})).data, date
);

const validateCases = (arrayToCheck, timeFrame=true) => {
	if (arrayToCheck.length == 0)
		throw new Error(msgFlag(process.argv[1].slice(-6,-3)) + ' : Array is empty');

	if (arrayToCheck.some((value, index) => {
		trapped = ['7','14','28'].some(t => value['cases' + t] === undefined) || (timeFrame ? (value.cases7 > value.cases14 || value.cases14 > value.cases28) : false);
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
		trapped = ['7','14','28'].some(t => value['deaths' + t] === undefined) || (timeFrame ? (value.deaths7 > value.deaths14 || value.deaths14 > value.deaths28) : false);
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
	csvPull: pullCSV,
	msg: {
		log: msgLog,
		info: msgInfo
	},
	validate: {
		cases: validateCases,
		deaths: validateDeaths,
		vaccine: validateVaccines
	},
	baseJSON: {
		cases: {
			cases7: 0, cases14: 0, cases28: 0,
			deaths7: 0, deaths14: 0, deaths28: 0
		},
		vaccine: {
			dose2_90: 0, dose2_180: 0, dose2: 0,
			dose3_90: 0, dose3_180: 0, dose3: 0
		}
	},
	compressHeaders: httpCompress
};
