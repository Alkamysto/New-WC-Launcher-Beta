/**
 * 🏠 Home Page Manager
 * ----------------------------------------------------------
 * Author  : Luuxis
 * License : CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 * Purpose : Main launcher page management (home.html)
 * ----------------------------------------------------------
 */

import {
	config,
	database,
	logger,
	changePanel,
	appdata,
	setStatus,
	pkg,
	popup,
} from '../utils.js';

const { Launch } = require('minecraft-java-core');
const { shell, ipcRenderer } = require('electron');

class Home {
	static id = 'home';

	/* ╔════════════════════════════════════════════════════╗
	   ║  🔧  INITIALIZATION                               ║
	   ╚════════════════════════════════════════════════════╝ */
	async init(config) {
		this.config = config;
		this.db = new database();

		await Promise.all([
			this.news(),
			this.instancesSelect(),
			this.displayUsername()
		]);

		this.socialLinks();
		this.startUsernameUpdateInterval();
		this.settingsButton();
	}

	/* ╔════════════════════════════════════════════════════╗
	   ║  🔄  UPDATE USERNAME                               ║
	   ╚════════════════════════════════════════════════════╝ */
	startUsernameUpdateInterval() {
		this.usernameUpdateInterval = setInterval(async () => {
			await this.displayUsername();
		}, 500); // 100ms est trop court, 500ms est suffisant et moins gourmand
	}

	async displayUsername() {
		const usernameEl = document.querySelector('.username-display');
		if (!usernameEl) return;

		const configClient = await this.db.readData('configClient');
		const auth = await this.db.readData('accounts', configClient?.account_selected);
		usernameEl.textContent = auth?.name || '';
	}

	/* ╔════════════════════════════════════════════════════╗
	   ║  📰  NEWS MANAGEMENT                               ║
	   ╚════════════════════════════════════════════════════╝ */
	async news() {
		const newsElement = document.querySelector('.news-list');
		if (!newsElement) return;

		const news = await config.getNews().catch(() => []);
		if (!news.length) return this.showNoNews(newsElement);

		news.forEach(item => {
			const date = this.getDate(item.publish_date);
			const block = document.createElement('div');
			block.classList.add('news-block');
			block.innerHTML = `
				<div class="news-header">
					<img class="server-status-icon" src="assets/images/waloucorp.png">
					<div class="header-text">
						<div class="title">${item.title}</div>
					</div>
					<div class="date">
						<div class="day">${date.day}</div>
						<div class="month">${date.month}</div>
					</div>
				</div>
				<div class="news-content">
					<div class="bbWrapper">
						<p>${item.content.replace(/\n/g, '<br>')}</p>
						<p class="news-author">Auteur - <span>${item.author}</span></p>
					</div>
				</div>`;
			newsElement.appendChild(block);
		});
	}

	showNoNews(newsElement) {
		newsElement.innerHTML = `
			<div class="news-block">
				<div class="news-header">
					<img class="server-status-icon" src="assets/images/waloucorp.png">
					<div class="header-text">
						<div class="title">Aucune news n'est actuellement disponible.</div>
					</div>
					<div class="date">
						<div class="day">1</div>
						<div class="month">Janvier</div>
					</div>
				</div>
				<div class="news-content">
					<div class="bbWrapper">
						<p>Vous pourrez suivre ici toutes les news relatives au serveur.</p>
					</div>
				</div>
			</div>`;
	}

	showNewsError(newsElement) {
		newsElement.innerHTML = `
			<div class="news-block">
				<div class="news-header">
					<img class="server-status-icon" src="assets/images/waloucorp.png">
					<div class="header-text">
						<div class="title">Erreur</div>
					</div>
					<div class="date">
						<div class="day">1</div>
						<div class="month">Janvier</div>
					</div>
				</div>
				<div class="news-content">
					<div class="bbWrapper">
						<p>Connexion impossible avec le serveur des news.<br>Merci de vérifier votre configuration.</p>
					</div>
				</div>
			</div>`;
	}

	/* ╔════════════════════════════════════════════════════╗
	   ║  🌐  SOCIAL LINKS                                   ║
	   ╚════════════════════════════════════════════════════╝ */
	socialLinks() {
		document.querySelectorAll('.social-block').forEach(social => {
			social.addEventListener('click', e => {
				const url = e.currentTarget.dataset.url;
				if (url) shell.openExternal(url);
			});
		});
	}

	/* ╔════════════════════════════════════════════════════╗
	   ║  🎮  INSTANCE SELECTION & LAUNCH                  ║
	   ╚════════════════════════════════════════════════════╝ */
	async instancesSelect() {
		const configClient = await this.db.readData('configClient');
		const auth = await this.db.readData('accounts', configClient?.account_selected);
		const instancesList = await config.getInstanceList();

		let instanceSelect = instancesList.find(i => i.name === configClient?.instance_selct)?.name;

		// Default to first non-whitelisted instance if none selected
		if (!instanceSelect) {
			const newInstance = instancesList.find(i => !i.whitelistActive);
			if (newInstance) {
				configClient.instance_selct = newInstance.name;
				instanceSelect = newInstance.name;
				await this.db.updateData('configClient', configClient);
			}
		}

		await setStatus(instancesList.find(i => i.name === instanceSelect)?.status);

		const instanceBTN = document.querySelector('.play-instance');
		const instancePopup = document.querySelector('.instance-popup');
		const instancesListPopup = document.querySelector('.instances-List');
		const instanceCloseBTN = document.querySelector('.close-popup');

		if (!instanceBTN || !instancePopup || !instancesListPopup || !instanceCloseBTN) return;

		instanceBTN.addEventListener('click', async e => {
			if (e.target.classList.contains('instance-select')) {
				this.renderInstanceList(instancesList, auth, instanceSelect, instancesListPopup);
				instancePopup.style.display = 'flex';
			} else {
				await this.startGame();
			}
		});

		instancePopup.addEventListener('click', async e => {
			if (!e.target.classList.contains('instance-elements')) return;

			const newInstance = e.target.id;
			document.querySelector('.active-instance')?.classList.remove('active-instance');
			e.target.classList.add('active-instance');

			configClient.instance_selct = newInstance;
			await this.db.updateData('configClient', configClient);
			instancePopup.style.display = 'none';
			await setStatus(instancesList.find(i => i.name === newInstance)?.status);
		});

		instanceCloseBTN.addEventListener('click', () => (instancePopup.style.display = 'none'));
	}

	renderInstanceList(instancesList, auth, selected, container) {
		container.innerHTML = '';
		instancesList.forEach(instance => {
			if (instance.whitelistActive && !instance.whitelist?.includes(auth?.name)) return;
			const activeClass = instance.name === selected ? 'active-instance' : '';
			container.innerHTML += `<div id="${instance.name}" class="instance-elements ${activeClass}">${instance.name}</div>`;
		});
	}

	/* ╔════════════════════════════════════════════════════╗
	   ║  ▶️  LAUNCH GAME                                    ║
	   ╚════════════════════════════════════════════════════╝ */
	async startGame() {
		const launch = new Launch();
		const configClient = await this.db.readData('configClient');
		const instancesList = await config.getInstanceList();
		const authenticator = await this.db.readData('accounts', configClient?.account_selected);
		const options = instancesList.find(i => i.name === configClient?.instance_selct);
		if (!options) return;

		const pathDir = `${await appdata()}/${process.platform === 'darwin' ? this.config.dataDirectory : `.${this.config.dataDirectory}`}`;
		const playBTN = document.querySelector('.play-instance');
		const infoBOX = document.querySelector('.info-starting-game');
		const infoText = document.querySelector('.info-starting-game-text');
		const progressBar = document.querySelector('.progress-bar');

		if (!playBTN || !infoBOX || !infoText || !progressBar) return;

		const opt = {
			url: options.url,
			authenticator,
			timeout: 10000,
			path: pathDir,
			instance: options.name,
			version: options.loadder?.minecraft_version,
			detached: configClient.launcher_config?.closeLauncher !== 'close-all',
			downloadFileMultiple: configClient.launcher_config?.download_multi,
			intelEnabledMac: configClient.launcher_config?.intelEnabledMac,
			loader: {
				type: options.loadder?.loadder_type,
				build: options.loadder?.loadder_version,
				enable: options.loadder?.loadder_type !== 'none',
			},
			verify: options.verify,
			ignored: [...options.ignored || []],
			java: {
				path: configClient.java_config?.java_path,
				autoDownload: true,
			},
			JVM_ARGS: options.jvm_args || [],
			GAME_ARGS: options.game_args || [],
			screen: configClient.game_config?.screen_size || { width: 1920, height: 1080 },
			memory: {
				min: `${configClient.java_config?.java_memory?.min * 1024 || 1024}M`,
				max: `${configClient.java_config?.java_memory?.max * 1024 || 2048}M`,
			},
		};

		playBTN.style.display = 'none';
		infoBOX.style.display = 'block';
		progressBar.style.display = '';

		launch.Launch(opt);
		this.registerLaunchEvents(launch, playBTN, infoBOX, infoText, progressBar, configClient);
	}

	registerLaunchEvents(launch, playBTN, infoBOX, infoText, progressBar, configClient) {
		let lastSpeed = null;

		const updateProgressText = (prefix, progress, size) => {
			const percent = ((progress / size) * 100).toFixed(0);
			infoText.innerHTML = `${prefix} ${percent}%${lastSpeed ? ` (${lastSpeed} Mo/s)` : ''}`;
			progressBar.value = progress;
			progressBar.max = size;
		};

		launch.on('extract', extract => { ipcRenderer.send('main-window-progress-load'); console.log(extract); });
		launch.on('progress', (progress, size) => updateProgressText('Téléchargement', progress, size));
		launch.on('check', (progress, size) => updateProgressText('Vérification', progress, size));
		launch.on('speed', speed => { if (speed) lastSpeed = (speed / 1024 / 1024).toFixed(2); });
		launch.on('patch', () => { infoText.innerHTML = `Mise à jour en cours...`; });
		launch.on('data', () => {
			progressBar.style.display = 'none';
			if (configClient.launcher_config?.closeLauncher === 'close-launcher') ipcRenderer.send('main-window-hide');
			new logger('Minecraft', '#36b030');
			infoText.innerHTML = `Lancement en cours...`;
		});
		launch.on('close', () => {
			if (configClient.launcher_config?.closeLauncher === 'close-launcher') ipcRenderer.send('main-window-show');
			ipcRenderer.send('main-window-progress-reset');
			infoBOX.style.display = 'none';
			playBTN.style.display = 'flex';
			infoText.innerHTML = `Vérification`;
			new logger(pkg.name, '#7289da');
		});
		launch.on('error', err => {
			const popupError = new popup();
			popupError.openPopup({ title: 'Erreur', content: err?.error || err, color: 'red', options: true });
			if (configClient.launcher_config?.closeLauncher === 'close-launcher') ipcRenderer.send('main-window-show');
			ipcRenderer.send('main-window-progress-reset');
			infoBOX.style.display = 'none';
			playBTN.style.display = 'flex';
			infoText.innerHTML = `Vérification`;
			new logger(pkg.name, '#7289da');
		});
	}

	/* ╔════════════════════════════════════════════════════╗
	   ║  ⚙️  SETTINGS BUTTON                                ║
	   ╚════════════════════════════════════════════════════╝ */
	settingsButton() {
		const btn = document.querySelector('.settings-btn');
		if (!btn) return;

		btn.addEventListener('click', () => {
			document.querySelector('.active-settings-BTN')?.classList.remove('active-settings-BTN');
			document.querySelector('#account')?.classList.add('active-settings-BTN');
			document.querySelector('.active-container-settings')?.classList.remove('active-container-settings');
			document.querySelector('#account-tab')?.classList.add('active-container-settings');
			changePanel('settings');
		});
	}

	/* ╔════════════════════════════════════════════════════╗
	   ║  📅  FORMAT DATE                                    ║
	   ╚════════════════════════════════════════════════════╝ */
	getDate(e) {
		const date = new Date(e);
		const months = [
			'Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'
		];
		return { year: date.getFullYear(), month: months[date.getMonth()], day: date.getDate() };
	}
}

/* ╔════════════════════════════════════════════════════╗
   ║ 🚀 EXPORT HOME CLASS                             ║
   ╚════════════════════════════════════════════════════╝ */
export default Home;