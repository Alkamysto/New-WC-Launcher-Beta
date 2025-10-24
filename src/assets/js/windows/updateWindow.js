/**
 * 🖥️ Update Window Manager (Frontend)
 * ----------------------------------------------------------
 * Author  : Luuxis
 * License : CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 * Purpose : Handles creation, display, and destruction of the
 *           auto-update window in the launcher frontend.
 * ----------------------------------------------------------
 */

'use strict';

const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const os = require('os');
const packageJson = require(path.join(app.getAppPath(), 'package.json'));

// ╔════════════════════════════════════════════════════╗
// ║ ⚙️  ENVIRONMENT CONFIGURATION                        ║
// ╚════════════════════════════════════════════════════╝
let dev = process.env.DEV_TOOL === 'open';
let updateWindow;

// ╔════════════════════════════════════════════════════╗
// ║ 🪟  GET CURRENT WINDOW REFERENCE                     ║
// ╚════════════════════════════════════════════════════╝
function getWindow() {
    return updateWindow;
}

// ╔════════════════════════════════════════════════════╗
// ║ ❌  DESTROY WINDOW                                   ║
// ╚════════════════════════════════════════════════════╝
function destroyWindow() {
    if (!updateWindow) return;
    updateWindow.close();
    updateWindow = undefined;
}

// ╔════════════════════════════════════════════════════╗
// ║ 🛠️  CREATE UPDATE WINDOW                              ║
// ╚════════════════════════════════════════════════════╝
function createWindow() {
    destroyWindow(); // Always start fresh

    updateWindow = new BrowserWindow({
        title: 'Mise à jour',
        width: 400,
        height: 500,
        resizable: false,
        icon: `./src/assets/images/icon.${os.platform() === 'win32' ? 'ico' : 'png'}`,
        frame: true,
        show: true,
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: true,
        },
    });

    // ╔════════════════════════════════════════════════════╗
    // ║ 🗂️  WINDOW MENU CONFIGURATION                       ║
    // ╚════════════════════════════════════════════════════╝
    Menu.setApplicationMenu(null);
    updateWindow.setMenuBarVisibility(false);

    // ╔════════════════════════════════════════════════════╗
    // ║ 🌐  LOAD FRONTEND HTML                               ║
    // ╚════════════════════════════════════════════════════╝
    updateWindow.loadFile(path.join(app.getAppPath(), 'src/index.html'));

    // ╔════════════════════════════════════════════════════╗
    // ║ 🔔  SHOW WINDOW WHEN READY                            ║
    // ╚════════════════════════════════════════════════════╝
    updateWindow.once('ready-to-show', () => {
        if (!updateWindow) return;

        if (dev) updateWindow.webContents.openDevTools({ mode: 'detach' });
        updateWindow.show();

        // Send app version to renderer
        updateWindow.webContents.send('app-version', packageJson.version);
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