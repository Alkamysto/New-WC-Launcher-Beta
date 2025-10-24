class skin2D {
	async creatHeadTexture(data) {
		try {
			const image = await getData(data);

			await waitForImageLoad(image, 8000);

			const canvas = document.createElement('canvas');
			canvas.width = 8;
			canvas.height = 8;
			const ctx = canvas.getContext('2d');

			ctx.drawImage(image, 8, 8, 8, 8, 0, 0, 8, 8);
			ctx.drawImage(image, 40, 8, 8, 8, 0, 0, 8, 8);

			return canvas.toDataURL('image/png');
		} catch (err) {
			console.error('💥 skin2D.creatHeadTexture error:', err);
			throw err;
		}
	}
}

async function getData(data) {
	if (!data || typeof data !== 'string') {
		throw new Error('⚠️ Donnée image invalide pour skin2D.');
	}

	if (data.startsWith('http://') || data.startsWith('https://')) {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 8000);

		let res;
		try {
			res = await nodeFetch(data, { signal: controller.signal });
		} catch (err) {
			clearTimeout(timeout);
			throw new Error(`🌐 Échec du téléchargement du skin : ${err.message}`);
		}
		clearTimeout(timeout);

		if (!res.ok) {
			throw new Error(`❌ HTTP Error ${res.status} ${res.statusText}`);
		}

		const buffer = await res.buffer();
		data = `data:image/png;base64,${buffer.toString('base64')}`;
	}

	const img = new Image();
	img.src = data;
	return img;
}

function waitForImageLoad(img, ms = 8000) {
	return new Promise((resolve, reject) => {
		let settled = false;
		const timeoutId = setTimeout(() => {
			if (!settled) {
				settled = true;
				reject(new Error('⏰ Chargement de l’image dépassé.'));
			}
		}, ms);

		img.onload = () => {
			if (!settled) {
				settled = true;
				clearTimeout(timeoutId);
				resolve();
			}
		};

		img.onerror = () => {
			if (!settled) {
				settled = true;
				clearTimeout(timeoutId);
				reject(new Error('💔 Échec du chargement de l’image.'));
			}
		};
	});
}

export default skin2D;
