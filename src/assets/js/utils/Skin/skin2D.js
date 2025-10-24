/**
 * 🧩 2D Skin Manager
 * ----------------------------------------------------------
 * Author  : Luuxis
 * License : CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 * Purpose : Generate 2D player head textures from Minecraft skins
 * ----------------------------------------------------------
 */

'use strict';

const nodeFetch = require('node-fetch');

/* ╔════════════════════════════════════════════════════╗
   ║ 👤 SKIN2D CLASS                                      ║
   ╚════════════════════════════════════════════════════╝ */
export class skin2D {
	/**
	 * Generates a head texture from a Minecraft skin
	 * @param {string} data - Base64 string or URL of the skin
	 * @returns {Promise<string>} - Data URL of the head texture
	 */
	async creatHeadTexture(data) {
		let image = await getData(data);

		return new Promise((resolve, reject) => {
			image.addEventListener('load', () => {
				// Create a small 8x8 canvas for the head
				let cvs = document.createElement('canvas');
				cvs.width = 8;
				cvs.height = 8;
				let ctx = cvs.getContext('2d');

				// Draw inner head
				ctx.drawImage(image, 8, 8, 8, 8, 0, 0, 8, 8);

				// Draw outer overlay
				ctx.drawImage(image, 40, 8, 8, 8, 0, 0, 8, 8);

				resolve(cvs.toDataURL());
			});
		});
	}
}

/* ╔════════════════════════════════════════════════════╗
   ║ 🌐 UTILITY FUNCTION                                  ║
   ╚════════════════════════════════════════════════════╝ */

/**
 * Converts a URL or Base64 string into an Image element
 * @param {string} data - URL or Base64 skin
 * @returns {Promise<Image>} - HTMLImageElement
 */
async function getData(data) {
	if (data.startsWith('http')) {
		// Fetch remote image as buffer and convert to Base64
		let response = await nodeFetch(data);
		let buffer = await response.buffer();
		data = `data:image/png;base64,${buffer.toString('base64')}`;
	}

	let img = new Image();
	img.src = data;
	return img;
}