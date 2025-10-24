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
	usernameUpdateInterval = null;

	async init(config) {
		this.config = config;
		this.db = new database();

		await Promise.all([this.news(), this.instancesSelect()]);
		this.setupSocialLinks();
		await this.displayUsername();
		this.startUsernameUpdateInterval();
		this.setupSettingsButton();
	}

	startUsernameUpdateInterval() {
		if (this.usernameUpdateInterval) clearInterval(this.usernameUpdateInterval);
		this.usernameUpdateInterval = setInterval(
			() => this.displayUsername(),
			500
		);
	}

	async displayUsername() {
		const usernameEl = document.querySelector('.username-display');
		if (!usernameEl) return;

		const configClient = await this.db.readData('configClient');
		const auth = await this.db.readData(
			'accounts',
			configClient?.account_selected
		);

		usernameEl.textContent = auth?.name || '';
	}

	async news() {
		const newsElement = document.querySelector('.news-list');
		if (!newsElement) return;

		let news = [];
		try {
			news = await config.getNews();
		} catch (err) {
			console.error('Erreur récupération news', err);
		}

		newsElement.innerHTML = '';

		if (!news || !news.length) {
			news = [
				{
					title: news ? 'Aucune news disponible' : 'Erreur',
					content: news
						? 'Vous pourrez suivre ici toutes les news relatives au serveur.'
						: 'Connexion impossible avec le serveur des news.<br>Merci de vérifier votre configuration.',
					author: 'Système',
					publish_date: new Date(),
				},
			];
		}

		for (const News of news) {
			const date = this.formatDate(News.publish_date);
			const block = document.createElement('div');
			block.classList.add('news-block');
			block.innerHTML = `
				<div class="news-header">
					<img class="server-status-icon" src="assets/images/icon.png">
					<div class="header-text">
						<div class="title">${News.title}</div>
					</div>
					<div class="date">
						<div class="day">${date.day}</div>
						<div class="month">${date.month}</div>
					</div>
				</div>
				<div class="news-content">
					<div class="bbWrapper">
						<p>${News.content.replace(/\n/g, '<br>')}</p>
						<p class="news-author">Auteur - <span>${News.author}</span></p>
					</div>
				</div>`;
			newsElement.appendChild(block);
		}
	}

	setupSocialLinks() {
		const socials = document.querySelectorAll('.social-block');
		socials.forEach((el) => {
			el.addEventListener('click', () => {
				const url = el.dataset.url;
				if (url) shell.openExternal(url);
			});
		});
	}

	async instancesSelect() {
		const configClient = await this.db.readData('configClient');
		const auth = await this.db.readData(
			'accounts',
			configClient?.account_selected
		);
		const instancesList = await config.getInstanceList();
		let instanceSelect = instancesList.find(
			(i) => i.name === configClient?.instance_selct
		)?.name;

		if (!instanceSelect) {
			const freeInstance = instancesList.find((i) => !i.whitelistActive);
			if (freeInstance) {
				instanceSelect = freeInstance.name;
				configClient.instance_selct = instanceSelect;
				await this.db.updateData('configClient', configClient);
			}
		}

		for (const instance of instancesList) {
			const isWhitelisted =
				!instance.whitelistActive || instance.whitelist?.includes(auth?.name);
			if (instance.name === instanceSelect && isWhitelisted) {
				await setStatus(instance.status);
			}
		}

		this.setupInstancePopup(instancesList, instanceSelect, auth);
	}

	setupInstancePopup(instancesList, instanceSelect, auth) {
		const instanceBTN = document.querySelector('.play-instance');
		const instancePopup = document.querySelector('.instance-popup');
		const instancesListPopup = document.querySelector('.instances-List');
		const instanceCloseBTN = document.querySelector('.close-popup');

		instanceBTN?.addEventListener('click', async (e) => {
			if (!e.target.classList.contains('instance-select'))
				return this.startGame();
			if (!instancesListPopup) return;

			instancesListPopup.innerHTML = '';

			for (const instance of instancesList) {
				const isAllowed =
					!instance.whitelistActive || instance.whitelist?.includes(auth?.name);
				if (!isAllowed) continue;

				const active =
					instance.name === instanceSelect ? 'active-instance' : '';
				instancesListPopup.innerHTML += `<div id="${instance.name}" class="instance-elements ${active}">${instance.name}</div>`;
			}

			instancePopup.style.display = 'flex';
		});

		instancePopup?.addEventListener('click', async (e) => {
			if (!e.target.classList.contains('instance-elements')) return;

			const newInstance = e.target.id;
			document
				.querySelector('.active-instance')
				?.classList.remove('active-instance');
			e.target.classList.add('active-instance');

			const configClient = await this.db.readData('configClient');
			configClient.instance_selct = newInstance;
			await this.db.updateData('configClient', configClient);

			instancePopup.style.display = 'none';
			const instanceData = await config.getInstanceList();
			const options = instanceData.find((i) => i.name === newInstance);
			await setStatus(options?.status);
		});

		instanceCloseBTN?.addEventListener('click', () => {
			instancePopup.style.display = 'none';
		});
	}

	async startGame() {
		const launch = new Launch();
		const configClient = await this.db.readData('configClient');
		const instanceOptions = (await config.getInstanceList()).find(
			(i) => i.name === configClient?.instance_selct
		);
		const authenticator = await this.db.readData(
			'accounts',
			configClient?.account_selected
		);

		if (!instanceOptions || !authenticator) return;

		const pathGame = `${await appdata()}/${process.platform === 'darwin' ? this.config.dataDirectory : `.${this.config.dataDirectory}`}`;

		const options = {
			url: instanceOptions.url,
			authenticator,
			timeout: 10000,
			path: pathGame,
			instance: instanceOptions.name,
			version: instanceOptions.loadder.minecraft_version,
			detached: configClient.launcher_config.closeLauncher !== 'close-all',
			downloadFileMultiple: configClient.launcher_config.download_multi,
			intelEnabledMac: configClient.launcher_config.intelEnabledMac,
			loader: {
				type: instanceOptions.loadder.loadder_type,
				build: instanceOptions.loadder.loadder_version,
				enable: instanceOptions.loadder.loadder_type !== 'none',
			},
			verify: instanceOptions.verify,
			ignored: [...instanceOptions.ignored],
			java: {
				path: configClient.java_config.java_path,
				autoDownload: true,
			},
			JVM_ARGS: instanceOptions.jvm_args || [],
			GAME_ARGS: instanceOptions.game_args || [],
			screen: {
				width: configClient.game_config.screen_size.width,
				height: configClient.game_config.screen_size.height,
			},
			memory: {
				min: `${configClient.java_config.java_memory.min * 1024}M`,
				max: `${configClient.java_config.java_memory.max * 1024}M`,
			},
		};

		const playInstanceBTN = document.querySelector('.play-instance');
		const infoBox = document.querySelector('.info-starting-game');
		const infoText = document.querySelector('.info-starting-game-text');
		const progressBar = document.querySelector('.progress-bar');

		playInstanceBTN.style.display = 'none';
		infoBox.style.display = 'block';
		progressBar.style.display = '';

		ipcRenderer.send('main-window-progress-load');

		let lastSpeed = null;

		const handleProgress = (progress, size) => {
			const percent = ((progress / size) * 100).toFixed(0);
			infoText.innerHTML = `Téléchargement ${percent}%`;
			if (lastSpeed) infoText.innerHTML += ` (${lastSpeed} Mo/s)`;
			progressBar.value = progress;
			progressBar.max = size;
			if (percent == 100) lastSpeed = null;
		};

		launch.on('extract', (data) => {
			ipcRenderer.send('main-window-progress-load');
			console.log(data);
		});

		launch.on('progress', handleProgress);

		launch.on('check', (progress, size) => {
			infoText.innerHTML = `Vérification ${((progress / size) * 100).toFixed(0)}%`;
			ipcRenderer.send('main-window-progress', { progress, size });
			progressBar.value = progress;
			progressBar.max = size;
		});

		launch.on('speed', (speed) => {
			if (speed) lastSpeed = (speed / 1024 / 1024).toFixed(2);
		});

		launch.on('patch', (patch) => {
			infoText.innerHTML = `Mise à jour en cours...`;
			console.log(patch);
		});

		launch.on('data', (data) => {
			progressBar.style.display = 'none';
			if (configClient.launcher_config.closeLauncher === 'close-launcher') {
				ipcRenderer.send('main-window-hide');
			}
			new logger('Minecraft', '#36b030');
			infoText.innerHTML = `Lancement en cours...`;
			console.log(data);
		});

		launch.on('close', () => {
			progressBar.style.display = 'none';
			playInstanceBTN.style.display = 'flex';
			infoText.innerHTML = `Vérification`;
			new logger(pkg.name, '#7289da');
			if (configClient.launcher_config.closeLauncher === 'close-launcher') {
				ipcRenderer.send('main-window-show');
			}
			ipcRenderer.send('main-window-progress-reset');
			console.log('Close');
		});

		launch.on('error', (err) => {
			new popup().openPopup({
				title: 'Erreur',
				content: err.error || err.message || 'Erreur inconnue',
				color: 'red',
				options: true,
			});
			progressBar.style.display = 'none';
			playInstanceBTN.style.display = 'flex';
			infoText.innerHTML = `Vérification`;
			ipcRenderer.send('main-window-progress-reset');
			if (configClient.launcher_config.closeLauncher === 'close-launcher') {
				ipcRenderer.send('main-window-show');
			}
			console.error(err);
		});
	}

	setupSettingsButton() {
		document.querySelector('.settings-btn')?.addEventListener('click', () => {
			document
				.querySelector('.active-settings-BTN')
				?.classList.remove('active-settings-BTN');
			document.querySelector('#account')?.classList.add('active-settings-BTN');

			document
				.querySelector('.active-container-settings')
				?.classList.remove('active-container-settings');
			document
				.querySelector('#account-tab')
				?.classList.add('active-container-settings');

			changePanel('settings');
		});
	}

	formatDate(dateStr) {
		const date = new Date(dateStr);
		const months = [
			'Janvier',
			'Février',
			'Mars',
			'Avril',
			'Mai',
			'Juin',
			'Juillet',
			'Août',
			'Septembre',
			'Octobre',
			'Novembre',
			'Décembre',
		];
		return {
			year: date.getFullYear(),
			month: months[date.getMonth()],
			day: date.getDate(),
		};
	}
}

export default Home;
