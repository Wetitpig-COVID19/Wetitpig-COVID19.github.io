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
	}
};
