import Login from './panels/login.js';
import Home from './panels/home.js';
import Settings from './panels/settings.js';

import {
	logger,
	config,
	changePanel,
	database,
	popup,
	setBackground,
	accountSelect,
	addAccount,
	pkg,
} from './utils.js';

const { Microsoft } = require('minecraft-java-core');
const { ipcRenderer } = require('electron');
const fs = require('fs');
const os = require('os');

class Launcher {
	async init() {
		try {
			this.initLog();
			console.log('🚀 Initializing Launcher...');
			this.shortcut();
			await setBackground();

			this.initFrame();

			this.config = await config.GetConfig().catch((err) => {
				console.error('💥 Config load error:', err);
				return { error: { code: 'CONFIG_ERROR', message: err.message } };
			});

			if (this.config.error) return this.errorConnect();

			this.db = new database();
			await this.initConfigClient();
			this.createPanels(Login, Home, Settings);
			await this.startLauncher();
		} catch (err) {
			console.error('💥 Launcher init failed:', err);
		}
	}

	initLog() {
		document.addEventListener('keydown', (e) => {
			if ((e.ctrlKey && e.shiftKey && e.code === 'KeyI') || e.code === 'F12') {
				ipcRenderer.send('main-window-dev-tools-close');
				ipcRenderer.send('main-window-dev-tools');
			}
		});

		new logger(pkg.name, '#7289da');
	}

	shortcut() {
		document.addEventListener('keydown', (e) => {
			if (e.ctrlKey && e.key === 'w') {
				ipcRenderer.send('main-window-close');
			}
		});
	}

	errorConnect() {
		new popup().openPopup({
			title: this.config.error.code,
			content: this.config.error.message,
			color: 'red',
			exit: true,
			options: true,
		});
	}

	initFrame() {
		console.log('🖼️ Initializing Frame...');
		const platform = os.platform() === 'darwin' ? 'darwin' : 'other';
		const frameElem = document.querySelector(`.${platform} .frame`);
		frameElem?.classList.toggle('hide');

		frameElem
			?.querySelector('#minimize')
			?.addEventListener('click', () =>
				ipcRenderer.send('main-window-minimize')
			);

		let maximized = false;
		const maximizeBtn = frameElem?.querySelector('#maximize');
		maximizeBtn?.addEventListener('click', () => {
			ipcRenderer.send('main-window-maximize');
			maximized = !maximized;
			maximizeBtn.classList.toggle('icon-maximize');
			maximizeBtn.classList.toggle('icon-restore-down');
		});

		frameElem
			?.querySelector('#close')
			?.addEventListener('click', () => ipcRenderer.send('main-window-close'));
	}

	async initConfigClient() {
		console.log('⚙️ Initializing Config Client...');
		let configClient = await this.db.readData('configClient');

		if (!configClient) {
			await this.db.createData('configClient', {
				account_selected: null,
				instance_selct: null,
				java_config: {
					java_path: null,
					java_memory: { min: 4, max: 16 },
				},
				game_config: {
					screen_size: { width: 1920, height: 1080 },
				},
				launcher_config: {
					download_multi: 5,
					theme: 'sombre',
					closeLauncher: 'close-launcher',
					intelEnabledMac: true,
				},
			});
		}
	}

	createPanels(...panels) {
		const panelsElem = document.querySelector('.panels');
		for (const panel of panels) {
			console.log(`🧩 Initializing ${panel.name} Panel...`);
			const div = document.createElement('div');
			div.classList.add('panel', panel.id);

			try {
				div.innerHTML = fs.readFileSync(
					`${__dirname}/panels/${panel.id}.html`,
					'utf8'
				);
			} catch (err) {
				console.error(`💥 Failed to load panel HTML for ${panel.id}:`, err);
			}

			panelsElem?.appendChild(div);
			new panel().init(this.config);
		}
	}

	async startLauncher() {
		try {
			let accounts = await this.db.readAllData('accounts');
			let configClient = await this.db.readData('configClient');
			let account_selected = configClient?.account_selected;
			const popupRefresh = new popup();

			if (accounts?.length) {
				for (let account of accounts) {
					if (account.error) {
						await this.db.deleteData('accounts', account.ID);
						continue;
					}

					if (account.meta?.type === 'Xbox') {
						console.log(
							`🎮 Account Type: ${account.meta.type} | Username: ${account.name}`
						);
						popupRefresh.openPopup({
							title: 'Connexion',
							content: `Type: ${account.meta.type} | Utilisateur: ${account.name}`,
							color: 'var(--dark)',
							background: false,
						});

						const refresh = await new Microsoft(this.config.client_id).refresh(
							account
						);

						if (refresh.error) {
							await this.db.deleteData('accounts', account.ID);
							if (account.ID === account_selected) {
								configClient.account_selected = null;
								await this.db.updateData('configClient', configClient);
							}
							console.error(
								`[Account] ${account.name}: ${refresh.errorMessage}`
							);
							continue;
						}

						refresh.ID = account.ID;
						await this.db.updateData('accounts', refresh, account.ID);
						await addAccount(refresh);
						if (account.ID === account_selected) await accountSelect(refresh);
					}
				}

				accounts = await this.db.readAllData('accounts');
				configClient = await this.db.readData('configClient');
				account_selected = configClient?.account_selected;

				if (!account_selected && accounts.length) {
					configClient.account_selected = accounts[0].ID;
					await this.db.updateData('configClient', configClient);
					await accountSelect(accounts[0]);
				}

				if (!accounts.length) {
					config.account_selected = null;
					await this.db.updateData('configClient', config);
					popupRefresh.closePopup();
					return changePanel('login');
				}

				popupRefresh.closePopup();
				await changePanel('home');
			} else {
				popupRefresh.closePopup();
				await changePanel('login');
			}
		} catch (err) {
			console.error('💥 startLauncher error:', err);
		}
	}
}

new Launcher().init();
