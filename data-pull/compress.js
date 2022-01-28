const fsPromises = require('fs/promises');
const fsConstants = require('fs').constants;
const zlib = require('zlib');
const util = require('util');

(async () => {
	const brotliCompressParams = async inputFile => ({
		chunkSize: 32 * 1024,
		params: {
			[zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
			[zlib.constants.BROTLI_PARAM_SIZE_HINT]: (await fsPromises.stat(inputFile)).size
		}
	});

	const brotliCompress = util.promisify(zlib.brotliCompress);

	const compressDir = async directory => {
		console.log(`Compressing assets/${directory}/...`);
		const mapDir = await fsPromises.opendir(`assets/${directory}/`);
		for await (const dirent of mapDir) {
			var fileData = await fsPromises.readFile(`assets/${directory}/${dirent.name}`);
			fileData = await brotliCompress(fileData, (await brotliCompressParams(`assets/${directory}/${dirent.name}`)));
			await fsPromises.writeFile(`assets/${directory}/${dirent.name}.br`, fileData);
		}
	}

	try {
		await fsPromises.access('assets/maps/DEU.json.br', fsConstants.R_OK);
		await compressDir('data');
	}
	catch {
		await Promise.all([
			compressDir('maps'), compressDir('data')
		]);
	}
})();
