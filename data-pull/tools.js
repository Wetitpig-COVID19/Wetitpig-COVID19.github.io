const Papa = require('papaparse');
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

const msgLog = msg => console.log(`${process.argv[1]}: ${msg}`);
const msgInfo = msg => console.info(`${process.argv[1]}: ${msg}`);

module.exports = {
	dateRegex: dateRegex,
	convertDate: convertDate,
	csvParse: parseCSV,
	msg: {
		log: msgLog,
		info: msgInfo
	}
};
