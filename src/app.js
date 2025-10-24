/**
 * 🧩 Electron Main Process
 * ------------------------
 * Author  : Luuxis
 * License : CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 * Purpose : Main process controlling the app lifecycle, windows, updates, and IPC.
 */

const { app, ipcMain, nativeTheme } = require("electron");
const { Microsoft } = require("minecraft-java-core");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const fs = require("fs").promises;

// 🪟 Window Classes
const UpdateWindow = require("./assets/js/windows/updateWindow.js");
const MainWindow = require("./assets/js/windows/mainWindow.js");

// ⚙️ Environment
const isDev = process.env.NODE_ENV === "dev";

/* ╔════════════════════════════════════════════════════╗
   ║  🗂️  PATHS & DATA CONFIGURATION                    ║
   ╚════════════════════════════════════════════════════╝ */
(async () => {
  if (isDev) {
    const appPath = path.resolve("./data/Launcher").replace(/\\/g, "/");
    const appData = path.resolve("./data").replace(/\\/g, "/");

    for (const dir of [appPath, appData]) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (err) {
        console.error(`⚠️ Failed to create directory ${dir}:`, err);
      }
    }

    app.setPath("userData", appPath);
    app.setPath("appData", appData);
  }
})();

/* ╔════════════════════════════════════════════════════╗
   ║  🚀  APP INSTANCE & STARTUP BEHAVIOR               ║
   ╚════════════════════════════════════════════════════╝ */
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.whenReady().then(() => {
    if (isDev) MainWindow.createWindow();
    else UpdateWindow.createWindow();
  });
}

/* ╔════════════════════════════════════════════════════╗
   ║  🧠  WINDOW HELPERS                                ║
   ╚════════════════════════════════════════════════════╝ */

/**
 * Safely retrieves the BrowserWindow instance
 */
function getSafeWindow(WindowClass) {
  const win = WindowClass.getWindow();
  if (!win) {
    console.warn(`⚠️ Window not found: ${WindowClass.name}`);
    return null;
  }
  return win;
}

/**
 * Sends an IPC message to a window safely
 */
function sendToWindow(WindowClass, channel, data) {
  const win = getSafeWindow(WindowClass);
  if (win) win.webContents.send(channel, data);
}

/* ╔════════════════════════════════════════════════════╗
   ║  🖥️  MAIN WINDOW - IPC EVENTS                     ║
   ╚════════════════════════════════════════════════════╝ */

const mainWindowIpcs = [
  ["main-window-open", () => MainWindow.createWindow()],
  ["main-window-close", () => MainWindow.destroyWindow()],
  ["main-window-hide", () => getSafeWindow(MainWindow)?.hide()],
  ["main-window-show", () => getSafeWindow(MainWindow)?.show()],
  ["main-window-minimize", () => getSafeWindow(MainWindow)?.minimize()],
  ["main-window-reload", () => getSafeWindow(MainWindow)?.reload()],
  ["main-window-dev-tools", () => getSafeWindow(MainWindow)?.webContents.openDevTools({ mode: "detach" })],
  ["main-window-dev-tools-close", () => getSafeWindow(MainWindow)?.webContents.closeDevTools()],
  ["main-window-maximize", () => {
    const win = getSafeWindow(MainWindow);
    if (!win) return;
    win.isMaximized() ? win.unmaximize() : win.maximize();
  }]
];

mainWindowIpcs.forEach(([channel, handler]) => ipcMain.on(channel, handler));

/* ╔════════════════════════════════════════════════════╗
   ║  📊  PROGRESS BAR HANDLERS                         ║
   ╚════════════════════════════════════════════════════╝ */

function setProgress(WindowClass, progress = -1, size = 1) {
  const win = getSafeWindow(WindowClass);
  if (win) win.setProgressBar(progress / size);
}

// Main Window Progress
ipcMain.on("main-window-progress", (_, options) =>
  setProgress(MainWindow, options.progress, options.size)
);
ipcMain.on("main-window-progress-reset", () => setProgress(MainWindow, -1));
ipcMain.on("main-window-progress-load", () => setProgress(MainWindow, 2));

// Update Window Progress
ipcMain.on("update-window-progress", (_, options) =>
  setProgress(UpdateWindow, options.progress, options.size)
);
ipcMain.on("update-window-progress-reset", () => setProgress(UpdateWindow, -1));
ipcMain.on("update-window-progress-load", () => setProgress(UpdateWindow, 2));

/* ╔════════════════════════════════════════════════════╗
   ║  🧭  UPDATE WINDOW - IPC EVENTS                    ║
   ╚════════════════════════════════════════════════════╝ */

ipcMain.on("update-window-close", () => UpdateWindow.destroyWindow());
ipcMain.on("update-window-dev-tools", () =>
  getSafeWindow(UpdateWindow)?.webContents.openDevTools({ mode: "detach" })
);

/* ╔════════════════════════════════════════════════════╗
   ║  🎨  THEME & PATH HANDLERS                         ║
   ╚════════════════════════════════════════════════════╝ */

ipcMain.handle("is-dark-theme", (_, theme) => {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return nativeTheme.shouldUseDarkColors;
});

ipcMain.handle("path-user-data", () => app.getPath("userData"));
ipcMain.handle("appData", () => app.getPath("appData"));

/* ╔════════════════════════════════════════════════════╗
   ║  🔐  MICROSOFT AUTHENTICATION                      ║
   ╚════════════════════════════════════════════════════╝ */

ipcMain.handle("Microsoft-window", async (_, clientId) => {
  try {
    const auth = await new Microsoft(clientId).getAuth();
    return auth;
  } catch (error) {
    console.error("❌ Microsoft Auth failed:", error);
    throw error;
  }
});

/* ╔════════════════════════════════════════════════════╗
   ║  🔄  APP UPDATES (electron-updater)                ║
   ╚════════════════════════════════════════════════════╝ */

autoUpdater.autoDownload = false;

// 🔎 Check for updates
ipcMain.handle("update-app", async () => {
  try {
    return await autoUpdater.checkForUpdates();
  } catch (error) {
    console.error("❌ Update check failed:", error);
    return { error: true, message: error.message };
  }
});

// ⬇️ Start update download
ipcMain.on("start-update", () => autoUpdater.downloadUpdate());

// 🪄 AutoUpdater Events
autoUpdater.on("update-available", () => sendToWindow(UpdateWindow, "updateAvailable"));
autoUpdater.on("update-not-available", () => sendToWindow(UpdateWindow, "update-not-available"));
autoUpdater.on("update-downloaded", () => autoUpdater.quitAndInstall());
autoUpdater.on("download-progress", (progress) => sendToWindow(UpdateWindow, "download-progress", progress));
autoUpdater.on("error", (err) => sendToWindow(UpdateWindow, "error", err.message || err));

/* ╔════════════════════════════════════════════════════╗
   ║  🧩  APP LIFECYCLE EVENTS                          ║
   ╚════════════════════════════════════════════════════╝ */

ipcMain.on("restart-app", () => {
  app.relaunch();
  app.exit(0);
});

app.on("window-all-closed", () => app.quit());