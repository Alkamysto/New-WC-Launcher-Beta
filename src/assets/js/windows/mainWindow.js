/**
 * 🖥️ Main Window Manager (Frontend)
 * ----------------------------------------------------------
 * Author  : Luuxis
 * License : CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 * Purpose : Handles creation, display, and destruction of the
 *           main launcher window frontend.
 * ----------------------------------------------------------
 */

'use strict';

const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const os = require('os');
const pkg = require('../../../../package.json');

// ╔════════════════════════════════════════════════════╗
// ║ ⚙️  ENVIRONMENT CONFIGURATION                        ║
// ╚════════════════════════════════════════════════════╝
const dev = process.env.DEV_TOOL === 'open';
let mainWindow;

// ╔════════════════════════════════════════════════════╗
// ║ 🪟  GET CURRENT WINDOW REFERENCE                     ║
// ╚════════════════════════════════════════════════════╝
function getWindow() {
    return mainWindow;
}

// ╔════════════════════════════════════════════════════╗
// ║ ❌  DESTROY WINDOW                                   ║
// ╚════════════════════════════════════════════════════╝
function destroyWindow() {
    if (!mainWindow) return;
    try {
        if (!mainWindow.isDestroyed()) mainWindow.close();
    } catch (err) {
        console.warn('⚠️ Error while closing main window:', err);
    } finally {
        mainWindow = undefined;
        app.quit();
    }
}

// ╔════════════════════════════════════════════════════╗
// ║ 🛠️  CREATE MAIN WINDOW                                 ║
// ╚════════════════════════════════════════════════════╝
function createWindow() {
    // Assure qu'aucune autre instance n'est ouverte
    destroyWindow();

    mainWindow = new BrowserWindow({
        title: `${pkg.productName || 'Launcher'} ${pkg.version}`,
        width: 1280,
        height: 900,
        minWidth: 1280,
        minHeight: 900,
        resizable: true,
        icon: path.join(app.getAppPath(), `src/assets/images/icon.${os.platform() === 'win32' ? 'ico' : 'png'}`),
        frame: true,
        show: false, // plus fluide, on affiche après "ready-to-show"
        backgroundColor: '#000000', // évite flash blanc à l’ouverture
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: true,
            devTools: dev, // plus sûr, évite d’ouvrir devtools en prod
        },
    });

    // ╔════════════════════════════════════════════════════╗
    // ║ 🗂️  WINDOW MENU CONFIGURATION                       ║
    // ╚════════════════════════════════════════════════════╝
    Menu.setApplicationMenu(null);
    mainWindow.setMenuBarVisibility(false);

    // ╔════════════════════════════════════════════════════╗
    // ║ 🌐  LOAD FRONTEND HTML                               ║
    // ╚════════════════════════════════════════════════════╝
    const mainPath = path.join(app.getAppPath(), 'src/launcher.html');
    mainWindow.loadFile(mainPath).catch(err => {
        console.error('❌ Failed to load launcher.html:', err);
    });

    // ╔════════════════════════════════════════════════════╗
    // ║ 🔔  SHOW WINDOW WHEN READY                            ║
    // ╚════════════════════════════════════════════════════╝
    mainWindow.once('ready-to-show', () => {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        if (dev) mainWindow.webContents.openDevTools({ mode: 'detach' });
        mainWindow.show();
    });

    // Gestion de fermeture propre
    mainWindow.on('closed', () => {
        mainWindow = undefined;
    });
}

// ╔════════════════════════════════════════════════════╗
// ║ 📦  MODULE EXPORTS                                   ║
// ╚════════════════════════════════════════════════════╝
module.exports = {
    getWindow,
    createWindow,
    destroyWindow,
};