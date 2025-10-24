const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const os = require('os');
const pkg = require('../../../../package.json');

const dev = process.env.DEV_TOOL === 'open';

let mainWindow;

function getWindow() {
	return mainWindow;
}

function destroyWindow() {
	if (!mainWindow) return;
	app.quit();
	mainWindow = undefined;
	console.log('🪄 MainWindow destroyed');
}

function createWindow() {
	destroyWindow();

	mainWindow = new BrowserWindow({
		title: `${pkg.preductname} ${pkg.version}`,
		width: 1280,
		height: 900,
		minWidth: 1280,
		minHeight: 900,
		resizable: true,
		frame: true,
		show: false,
		icon: `./src/assets/images/icon.${os.platform() === 'win32' ? 'ico' : 'png'}`,
		webPreferences: {
			contextIsolation: false,
			nodeIntegration: true,
		},
	});

	Menu.setApplicationMenu(null);
	mainWindow.setMenuBarVisibility(false);

	const launcherFile = path.join(app.getAppPath(), 'src/launcher.html');
	mainWindow.loadFile(launcherFile).catch((err) => {
		console.error('💥 Failed to load launcher HTML:', err);
	});

	mainWindow.once('ready-to-show', () => {
		if (!mainWindow) return;
		if (dev) mainWindow.webContents.openDevTools({ mode: 'detach' });
		mainWindow.show();
		console.log('🚀 MainWindow ready and shown');
	});

	mainWindow.on('closed', () => {
		mainWindow = undefined;
		console.log('🪄 MainWindow closed');
	});
}

module.exports = {
	getWindow,
	createWindow,
	destroyWindow,
};
