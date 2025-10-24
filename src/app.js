const { app, ipcMain, nativeTheme } = require('electron');
const { Microsoft } = require('minecraft-java-core');
const { autoUpdater } = require('electron-updater');

const path = require('path');
const fs = require('fs');

const UpdateWindow = require('./assets/js/windows/updateWindow.js');
const MainWindow = require('./assets/js/windows/mainWindow.js');

const dev = process.env.NODE_ENV === 'dev';

if (dev) {
	const appPath = path.resolve('./data/Launcher');
	const appDataPath = path.resolve('./data');

	[appPath, appDataPath].forEach((p) => {
		if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
	});

	app.setPath('userData', appPath);
	app.setPath('appData', appDataPath);
}

if (!app.requestSingleInstanceLock()) {
	console.log('⚠️ Une autre instance est déjà lancée ! Fermeture...');
	app.quit();
} else {
	app.whenReady().then(() => {
		if (dev) {
			console.log('🔧 Mode DEV activé - Ouverture de MainWindow');
			MainWindow.createWindow();
		} else {
			console.log('🚀 Ouverture de la fenêtre de mise à jour...');
			UpdateWindow.createWindow();
		}
	});
}

const sendProgress = (win, progress) => {
	if (win && !win.isDestroyed()) {
		win.setProgressBar(progress);
	}
};

ipcMain.on('main-window-open', () => MainWindow.createWindow());
ipcMain.on('main-window-dev-tools', () =>
	MainWindow.getWindow()?.webContents.openDevTools({ mode: 'detach' })
);
ipcMain.on('main-window-dev-tools-close', () =>
	MainWindow.getWindow()?.webContents.closeDevTools()
);
ipcMain.on('main-window-close', () => MainWindow.destroyWindow());
ipcMain.on('main-window-reload', () => MainWindow.getWindow()?.reload());
ipcMain.on('main-window-progress', (event, options) =>
	sendProgress(MainWindow.getWindow(), options.progress / options.size)
);
ipcMain.on('main-window-progress-reset', () =>
	sendProgress(MainWindow.getWindow(), -1)
);
ipcMain.on('main-window-progress-load', () =>
	sendProgress(MainWindow.getWindow(), 2)
);
ipcMain.on('main-window-minimize', () => MainWindow.getWindow()?.minimize());
ipcMain.on('main-window-maximize', () => {
	const win = MainWindow.getWindow();
	if (!win) return;
	if (win.isMaximized()) win.unmaximize();
	else win.maximize();
});
ipcMain.on('main-window-hide', () => MainWindow.getWindow()?.hide());
ipcMain.on('main-window-show', () => MainWindow.getWindow()?.show());

ipcMain.on('update-window-close', () => UpdateWindow.destroyWindow());
ipcMain.on('update-window-dev-tools', () =>
	UpdateWindow.getWindow()?.webContents.openDevTools({ mode: 'detach' })
);
ipcMain.on('update-window-progress', (event, options) =>
	sendProgress(UpdateWindow.getWindow(), options.progress / options.size)
);
ipcMain.on('update-window-progress-reset', () =>
	sendProgress(UpdateWindow.getWindow(), -1)
);
ipcMain.on('update-window-progress-load', () =>
	sendProgress(UpdateWindow.getWindow(), 2)
);

ipcMain.on('restart-app', () => {
	console.log('🔄 Relancement du launcher...');
	app.relaunch();
	app.exit(0);
});

ipcMain.handle('path-user-data', () => app.getPath('userData'));
ipcMain.handle('appData', () => app.getPath('appData'));

ipcMain.handle('Microsoft-window', async (_, client_id) => {
	try {
		return await new Microsoft(client_id).getAuth();
	} catch (err) {
		console.error('💥 Erreur Microsoft Auth :', err);
		return { error: true, message: err.message || 'Unknown error' };
	}
});

ipcMain.handle('is-dark-theme', (_, theme) => {
	if (theme === 'dark') return true;
	if (theme === 'light') return false;
	return nativeTheme.shouldUseDarkColors;
});

app.on('window-all-closed', () => app.quit());

autoUpdater.autoDownload = false;

ipcMain.handle('update-app', async () => {
	try {
		const res = await autoUpdater.checkForUpdates();
		return res;
	} catch (error) {
		console.error('💥 Update check failed :', error);
		return { error: true, message: error.message || 'Update failed' };
	}
});

autoUpdater.on('update-available', () => {
	const win = UpdateWindow.getWindow();
	if (win) win.webContents.send('updateAvailable');
});

ipcMain.on('start-update', () => {
	console.log('⬇️ Téléchargement de la mise à jour...');
	autoUpdater.downloadUpdate();
});

autoUpdater.on('update-not-available', () => {
	const win = UpdateWindow.getWindow();
	if (win) win.webContents.send('update-not-available');
});

autoUpdater.on('update-downloaded', () => {
	console.log('✅ Update téléchargée, redémarrage...');
	autoUpdater.quitAndInstall();
});

autoUpdater.on('download-progress', (progress) => {
	const win = UpdateWindow.getWindow();
	if (win) win.webContents.send('download-progress', progress);
});

autoUpdater.on('error', (err) => {
	console.error('💥 Update error:', err);
	const win = UpdateWindow.getWindow();
	if (win) win.webContents.send('error', err);
});
