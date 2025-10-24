/**
 * 🔄 Launcher Auto-Updater
 * ----------------------------------------------------------
 * Author  : Luuxis
 * License : CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 * Purpose : Handles launcher startup animation, update checks,
 *           download handling, and maintenance verification.
 * ----------------------------------------------------------
 */

const { ipcRenderer, shell } = require('electron');
const pkg = require('../package.json');
const os = require('os');
import { config, database } from './utils.js';
const nodeFetch = require('node-fetch');

// ╔════════════════════════════════════════════════════╗
// ║ 💠 SPLASH SCREEN CLASS                            ║
// ╚════════════════════════════════════════════════════╝
class Splash {
	constructor() {
		this.splash = document.querySelector('.splash');
		this.splashMessage = document.querySelector('.splash-message');
		this.splashAuthor = document.querySelector('.splash-author');
		this.message = document.querySelector('.message');
		this.progress = document.querySelector('.progress');
		this.version = document.querySelector('.version');

		document.addEventListener('DOMContentLoaded', async () => {
			const databaseLauncher = new database();
			const configClient = await databaseLauncher.readData('configClient');
			const theme = configClient?.launcher_config?.theme || 'auto';

			// Active le thème selon la préférence utilisateur ou le système
			const isDarkTheme = await ipcRenderer.invoke('is-dark-theme', theme);
			document.body.className = isDarkTheme ? 'dark global' : 'light global';

			// Barre de progression sur Windows
			if (process.platform === 'win32') ipcRenderer.send('update-window-progress-load');

			await this.startAnimation();
		});
	}

	/* ╔════════════════════════════════════════════════════╗
	   ║  ✨ STARTUP ANIMATION SEQUENCE                      ║
	   ╚════════════════════════════════════════════════════╝ */
	async startAnimation() {
		const splashes = [
			{ message: 'DOMMAGE !', author: 'Walou' },
			{ message: 'Pierre Edouard ton goûter', author: 'Walou' },
			{ message: "Quelqu'un à vu espace ?", author: 'Walou' },
			{ message: 'Tah Selles-sur-Cher...', author: 'Saluzzo' },
			{ message: 'Il reste du Bougnoulai ?', author: 'Saluzzo' },
			{ message: '', author: '' },
		];

		const splash = splashes[Math.floor(Math.random() * splashes.length)];
		this.splashMessage.textContent = splash.message;
		this.splashAuthor.children[0].textContent = splash.author ? '@' + splash.author : '';

		await sleep(100);
		document.querySelector('#splash').style.display = 'block';
		await sleep(500);
		this.splash.classList.add('opacity');
		await sleep(500);
		this.splash.classList.add('translate');
		this.splashMessage.classList.add('opacity');
		this.splashAuthor.classList.add('opacity');
		this.message.classList.add('opacity');
		this.version.classList.add('opacity');

		await sleep(1000);
		await this.checkUpdate();
	}

	/* ╔════════════════════════════════════════════════════╗
	   ║  🔎 UPDATE CHECK HANDLER                           ║
	   ╚════════════════════════════════════════════════════╝ */
	async checkUpdate() {
		this.setStatus(`Recherche de mise à jour...`);
		await sleep(50);

		// Enregistre les listeners **avant** l'invoke
		ipcRenderer.once('updateAvailable', async () => {
			this.setStatus(`Mise à jour disponible !`);
			if (os.platform() === 'win32') {
				this.toggleProgress();
				ipcRenderer.send('start-update');
			} else {
				await this.downloadUpdate();
			}
		});

		ipcRenderer.once('update-not-available', () => {
			console.log('Aucune mise à jour disponible.');
			this.maintenanceCheck();
		});

		ipcRenderer.on('error', (event, err) => {
			if (err) this.shutdown(`${err.message}`);
		});

		ipcRenderer.on('download-progress', (event, progress) => {
			ipcRenderer.send('update-window-progress', {
				progress: progress.transferred,
				size: progress.total,
			});
			this.setProgress(progress.transferred, progress.total);
		});

		// Appelle l'invoke **après** avoir enregistré les listeners
		try {
			await ipcRenderer.invoke('update-app');
		} catch (err) {
			return this.shutdown(`Erreur lors de la recherche de mise à jour : <br>${err.message}`);
		}
	}

	/* ╔════════════════════════════════════════════════════╗
	   ║  🧩 RELEASE SELECTION UTIL                         ║
	   ╚════════════════════════════════════════════════════╝ */
	getLatestReleaseForOS(osName, preferredFormat, assets) {
		return assets
			.filter(a => a.name.toLowerCase().includes(osName) && a.name.endsWith(preferredFormat))
			.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
	}

	/* ╔════════════════════════════════════════════════════╗
	   ║  📥 MANUAL UPDATE (macOS / Linux)                  ║
	   ╚════════════════════════════════════════════════════╝ */
	async downloadUpdate() {
		try {
			const repoPath = pkg.repository.url.replace('git+', '').replace('.git', '').replace('https://github.com/', '');
			const [owner, repo] = repoPath.split('/');

			const releases = await nodeFetch(`https://api.github.com/repos/${owner}/${repo}/releases`)
				.then(res => res.json());

			const latestRelease = releases[0].assets;
			let latestAsset;

			if (os.platform() === 'darwin') latestAsset = this.getLatestReleaseForOS('mac', '.dmg', latestRelease);
			if (os.platform() === 'linux') latestAsset = this.getLatestReleaseForOS('linux', '.appimage', latestRelease);

			if (!latestAsset) return this.shutdown('Impossible de récupérer la mise à jour.');

			this.setStatus(`Mise à jour disponible !<br><div class="download-update">Télécharger</div>`);

			document.querySelector('.download-update').addEventListener('click', () => {
				shell.openExternal(latestAsset.browser_download_url);
				this.shutdown('Téléchargement en cours...');
			});
		} catch (err) {
			this.shutdown(`Erreur lors de la récupération de la mise à jour : <br>${err.message}`);
		}
	}

	/* ╔════════════════════════════════════════════════════╗
	   ║  🧱 MAINTENANCE CHECK                              ║
	   ╚════════════════════════════════════════════════════╝ */
	async maintenanceCheck() {
		try {
			const res = await config.GetConfig();
			if (res.maintenance) return this.shutdown(res.maintenance_message);
			this.startLauncher();
		} catch {
			this.shutdown('Aucune connexion internet détectée,<br>veuillez réessayer ultérieurement.');
		}
	}

	/* ╔════════════════════════════════════════════════════╗
	   ║  🚀 LAUNCHER STARTUP                               ║
	   ╚════════════════════════════════════════════════════╝ */
	startLauncher() {
		this.setStatus(`Démarrage du launcher`);
		ipcRenderer.send('main-window-open');
		ipcRenderer.send('update-window-close');
	}

	/* ╔════════════════════════════════════════════════════╗
	   ║  💀 SHUTDOWN SEQUENCE                              ║
	   ╚════════════════════════════════════════════════════╝ */
	shutdown(text) {
		this.setStatus(`${text}<br>Arrêt dans 5s`);
		let i = 4;
		const interval = setInterval(() => {
			this.setStatus(`${text}<br>Arrêt dans ${i--}s`);
			if (i < 0) {
				clearInterval(interval);
				ipcRenderer.send('update-window-close');
			}
		}, 1000);
	}

	/* ╔════════════════════════════════════════════════════╗
	   ║  📊 STATUS & PROGRESS HELPERS                      ║
	   ╚════════════════════════════════════════════════════╝ */
	setStatus(text) {
		this.message.innerHTML = text;
	}

	toggleProgress() {
		if (this.progress.classList.toggle('show')) this.setProgress(0, 1);
	}

	setProgress(value, max) {
		this.progress.value = value;
		this.progress.max = max;
	}
}

// ╔════════════════════════════════════════════════════╗
// ║ 🌐 WINDOW EVENT HANDLERS                           ║
// ╚════════════════════════════════════════════════════╝
window.addEventListener('DOMContentLoaded', () => {
	ipcRenderer.on('app-version', (event, version) => {
		document.querySelector('.version').innerText = `Version : ${version}`;
	});
});

/* ╔════════════════════════════════════════════════════╗
   ║ 💤 UTILITY : ASYNC SLEEP                           ║
   ╚════════════════════════════════════════════════════╝ */
function sleep(ms) {
	return new Promise(r => setTimeout(r, ms));
}

/* ╔════════════════════════════════════════════════════╗
   ║ 🧰 DEV TOOLS SHORTCUT                              ║
   ╚════════════════════════════════════════════════════╝ */
document.addEventListener('keydown', e => {
	if ((e.ctrlKey && e.shiftKey && e.code === 'KeyI') || e.code === 'F12') {
		ipcRenderer.send('update-window-dev-tools');
	}
});

// ╔════════════════════════════════════════════════════╗
// ║ 🧠 EXECUTION ENTRY POINT                           ║
// ╚════════════════════════════════════════════════════╝
new Splash();