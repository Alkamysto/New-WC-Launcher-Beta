const { ipcRenderer, shell } = require('electron');
const os = require('os');
const pkg = require('../package.json');
const nodeFetch = require('node-fetch');
import { config, database } from './utils.js';

class Splash {
	constructor() {
		this.splash = document.querySelector('.splash');
		this.splashMessage = document.querySelector('.splash-message');
		this.splashAuthor = document.querySelector('.splash-author');
		this.message = document.querySelector('.message');
		this.progress = document.querySelector('.progress');
		this.version = document.querySelector('.version');

		document.addEventListener('DOMContentLoaded', async () => {
			try {
				const dbLauncher = new database();
				const configClient = await dbLauncher.readData('configClient');
				const theme = configClient?.launcher_config?.theme || 'auto';
				const isDarkTheme = await ipcRenderer.invoke('is-dark-theme', theme);

				document.body.className = isDarkTheme ? 'dark global' : 'light global';

				if (process.platform === 'win32')
					ipcRenderer.send('update-window-progress-load');

				await this.startAnimation();
			} catch (err) {
				console.error('💥 Splash initialization error:', err);
			}
		});
	}

	async startAnimation() {
		try {
			const splashes = [
				{ message: 'Dommage...', author: 'Walou' },
				{ message: 'Pierre Edouard ton goûter', author: 'Walou' },
				{ message: "Quelqu'un à vu espace ?", author: 'Walou' },
			];

			const splash = splashes[Math.floor(Math.random() * splashes.length)];
			this.splashMessage.textContent = splash.message;
			this.splashAuthor.children[0].textContent = '@' + splash.author;

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
		} catch (err) {
			console.error('💥 Splash animation error:', err);
		}
	}

	async checkUpdate() {
		try {
			this.setStatus('🔍 Recherche de mise à jour...');

			ipcRenderer.invoke('update-app').catch((err) => {
				return this.shutdown(
					`💥 Erreur recherche mise à jour :<br>${err.message}`
				);
			});

			ipcRenderer.on('updateAvailable', () => {
				this.setStatus('⚡ Mise à jour disponible !');

				if (os.platform() === 'win32') {
					this.toggleProgress();
					ipcRenderer.send('start-update');
				} else {
					this.downloadUpdate();
				}
			});

			ipcRenderer.on('error', (event, err) => {
				if (err) this.shutdown(`💥 ${err.message}`);
			});

			ipcRenderer.on('download-progress', (event, progress) => {
				ipcRenderer.send('update-window-progress', {
					progress: progress.transferred,
					size: progress.total,
				});
				this.setProgress(progress.transferred, progress.total);
			});

			ipcRenderer.on('update-not-available', () => {
				console.log('ℹ️ Mise à jour non disponible');
				this.maintenanceCheck();
			});
		} catch (err) {
			console.error('💥 checkUpdate error:', err);
		}
	}

	getLatestReleaseForOS(osName, preferredFormat, assets) {
		return assets
			.filter((asset) => {
				const name = asset.name.toLowerCase();
				return name.includes(osName) && name.endsWith(preferredFormat);
			})
			.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
	}

	async downloadUpdate() {
		try {
			const repoParts = pkg.repository.url
				.replace('git+', '')
				.replace('.git', '')
				.replace('https://github.com/', '')
				.split('/');
			const apiBase = 'https://api.github.com/repos';
			const releasesURL = `${apiBase}/${repoParts[0]}/${repoParts[1]}/releases`;

			const releases = await nodeFetch(releasesURL).then((res) => res.json());
			const latestRelease = releases[0]?.assets || [];

			let latestAsset;
			if (os.platform() === 'darwin')
				latestAsset = this.getLatestReleaseForOS('mac', '.dmg', latestRelease);
			else if (os.platform() === 'linux')
				latestAsset = this.getLatestReleaseForOS(
					'linux',
					'.appimage',
					latestRelease
				);

			if (!latestAsset) throw new Error('Aucun asset compatible trouvé !');

			this.setStatus(
				'⚡ Mise à jour disponible !<br><div class="download-update">Télécharger</div>'
			);

			document
				.querySelector('.download-update')
				?.addEventListener('click', () => {
					shell.openExternal(latestAsset.browser_download_url);
					this.shutdown('💾 Téléchargement en cours...');
				});
		} catch (err) {
			console.error('💥 downloadUpdate error:', err);
			this.shutdown(`Erreur mise à jour :<br>${err.message}`);
		}
	}

	async maintenanceCheck() {
		try {
			const res = await config.GetConfig();
			if (res.maintenance) return this.shutdown(res.maintenance_message);
			this.startLauncher();
		} catch (err) {
			console.error('💥 maintenanceCheck error:', err);
			this.shutdown(
				'⚠️ Aucune connexion internet détectée,<br>veuillez réessayer ultérieurement.'
			);
		}
	}

	startLauncher() {
		this.setStatus('🚀 Démarrage du launcher...');
		ipcRenderer.send('main-window-open');
		ipcRenderer.send('update-window-close');
	}

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

window.addEventListener('DOMContentLoaded', () => {
	ipcRenderer.on('app-version', (event, version) => {
		document.querySelector('.version').innerText = `Version : ${version}`;
	});
});

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

document.addEventListener('keydown', (e) => {
	if ((e.ctrlKey && e.shiftKey && e.code === 'KeyI') || e.code === 'F12') {
		ipcRenderer.send('update-window-dev-tools');
	}
});

new Splash();
