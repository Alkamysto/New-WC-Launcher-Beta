const originalConsole = {
	log: console.log,
	info: console.info,
	warn: console.warn,
	debug: console.debug,
	error: console.error,
};

class Logger {
	constructor(name = 'Logger', color = '#7289da') {
		this.name = name;
		this.color = color;

		this._bindConsoleMethods();
		this.log('🟢 Logger initialisé avec succès');
	}

	_bindConsoleMethods() {
		const format = (...args) => [
			`%c[${this.name}]%c →`,
			`color: ${this.color}; font-weight:bold;`,
			'color: inherit;',
			...args,
		];

		console.log = (...args) =>
			originalConsole.log.apply(console, format(...args));
		console.info = (...args) =>
			originalConsole.info.apply(console, format(...args));
		console.warn = (...args) =>
			originalConsole.warn.apply(console, format(...args));
		console.debug = (...args) =>
			originalConsole.debug.apply(console, format(...args));
		console.error = (...args) =>
			originalConsole.error.apply(console, format(...args));
	}

	log(...args) {
		originalConsole.log.apply(console, this._formatArgs(...args));
	}
	info(...args) {
		originalConsole.info.apply(console, this._formatArgs(...args));
	}
	warn(...args) {
		originalConsole.warn.apply(console, this._formatArgs(...args));
	}
	debug(...args) {
		originalConsole.debug.apply(console, this._formatArgs(...args));
	}
	error(...args) {
		originalConsole.error.apply(console, this._formatArgs(...args));
	}

	_formatArgs(...args) {
		return [
			`%c[${this.name}]%c →`,
			`color: ${this.color}; font-weight:bold;`,
			'color: inherit;',
			...args,
		];
	}
}

export default Logger;
