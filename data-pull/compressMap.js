const fsPromises = require('fs/promises');
const zlib = require('zlib');
const util = require('util');

(async () => {
	const brotliCompressParams = async inputFile => ({
		chunkSize: 32 * 1024,
		params: {
			[zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
			[zlib.constants.BROTLI_PARAM_QUALITY]: 4,
			[zlib.constants.BROTLI_PARAM_SIZE_HINT]: (await fsPromises.stat(inputFile)).size
		}
	});

	const brotliCompress = util.promisify(zlib.brotliCompress)
	const mapDir = await fsPromises.opendir('assets/maps/');
	for await (const dirent of mapDir) {
		var fileData = await fsPromises.readFile('assets/maps/' + dirent.name);
		fileData = await brotliCompress(fileData, (await brotliCompressParams('assets/maps/' + dirent.name)));
		await fsPromises.writeFile('assets/maps/' + dirent.name + '.br', fileData);
	}
})();
