const { opendir } = require('fs/promises');
const { Worker } = require('worker_threads');

(async () => {
	const scriptF = new RegExp(/^pull[A-Z]{3}\.js$/);
	const workers = [];

	const scriptDir = await opendir('data-pull');
	for await (scriptFile of scriptDir) {
		if (scriptF.test(scriptFile.name))
			workers.push(
				new Promise((resolve, reject) => {
					const worker = new Worker(__dirname + '/' + scriptFile.name);
					worker.on('exit', code => {
						if (code === 0)
							resolve();
						else
							reject(new Error(`Worker of ${scriptFile.name} exited with code ${code}`));
					})
				})
			);
	}

	await Promise.all(workers).catch(err => {
		throw err;
	});
})();
