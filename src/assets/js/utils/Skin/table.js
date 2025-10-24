const head = deepFreeze({
	inner: [
		[8, 8, 8, 8], // Front
		[24, 8, 8, 8], // Back
		[0, 8, 8, 8], // Left
		[16, 8, 8, 8], // Right
		[8, 0, 8, 8], // Top
		[16, 0, 8, 8], // Bottom
	],
	outer: [
		[40, 8, 8, 8], // Front (outer layer)
		[56, 8, 8, 8], // Back
		[32, 8, 8, 8], // Left
		[48, 8, 8, 8], // Right
		[40, 0, 8, 8], // Top
		[48, 0, 8, 8], // Bottom
	],
});

const body = deepFreeze({
	inner: [
		[20, 20, 8, 12], // Front
		[32, 20, 8, 12], // Back
		[16, 20, 4, 12], // Left
		[28, 20, 4, 12], // Right
		[20, 16, 8, 4], // Top
		[28, 16, 8, 4], // Bottom
	],
	outer: [
		[20, 36, 8, 12], // Front (outer layer)
		[32, 36, 8, 12], // Back
		[16, 36, 4, 12], // Left
		[28, 36, 4, 12], // Right
		[20, 32, 8, 4], // Top
		[28, 32, 8, 4], // Bottom
	],
});

function deepFreeze(obj) {
	Object.getOwnPropertyNames(obj).forEach((prop) => {
		if (
			obj[prop] !== null &&
			(typeof obj[prop] === 'object' || typeof obj[prop] === 'function')
		) {
			deepFreeze(obj[prop]);
		}
	});
	return Object.freeze(obj);
}

export default deepFreeze({ head, body });
