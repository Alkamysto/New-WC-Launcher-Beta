const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const os = require('os');
const pkg = require('../../../../package.json');

const dev = process.env.DEV_TOOL === 'open';

let updateWindow;

function getWindow() {
	return updateWindow;
}

function destroyWindow() {
	if (!updateWindow) return;
	updateWindow.close();
	updateWindow = undefined;
	console.log('🪄 UpdateWindow destroyed');
}

function createWindow() {
	destroyWindow();

	updateWindow = new BrowserWindow({
		title: `${pkg.preductname} Updater ${pkg.version}`,
		width: 400,
		height: 600,
		resizable: false,
		frame: false,
		show: false,
		icon: `./src/assets/images/icon.${os.platform() === 'win32' ? 'ico' : 'png'}`,
		webPreferences: {
			contextIsolation: false,
			nodeIntegration: true,
		},
	});

	Menu.setApplicationMenu(null);
	updateWindow.setMenuBarVisibility(false);

	const indexFile = path.join(app.getAppPath(), 'src/index.html');
	updateWindow.loadFile(indexFile).catch((err) => {
		console.error('💥 Failed to load update window HTML:', err);
	});

	updateWindow.once('ready-to-show', () => {
		if (!updateWindow) return;
		if (dev) updateWindow.webContents.openDevTools({ mode: 'detach' });
		updateWindow.show();

		try {
			const packageJson = require(path.join(app.getAppPath(), 'package.json'));
			updateWindow.webContents.send('app-version', packageJson.version);
		} catch (err) {
			console.error('💥 Failed to send app version:', err);
		}
	});

	updateWindow.on('closed', () => {
		updateWindow = undefined;
		console.log('🪄 UpdateWindow closed');
	});
}

module.exports = {
	getWindow,
	createWindow,
	destroyWindow,
};
