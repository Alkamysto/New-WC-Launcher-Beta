/**
 * 🧩 Launcher Main Window Manager
 * ----------------------------------------------------------
 * Author  : Luuxis
 * License : CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 * Purpose : Handles launcher initialization, UI panels,
 *           account management, and Microsoft authentication.
 * ----------------------------------------------------------
 */

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
const fs = require('fs').promises;
const os = require('os');

// ╔════════════════════════════════════════════════════╗
// ║ 🎮 LAUNCHER CLASS - CORE INITIALIZATION            ║
// ╚════════════════════════════════════════════════════╝
class Launcher {
	/* ----------------------------------------------------
	 * 🚀 ENTRY POINT
	 * ---------------------------------------------------- */
	async init() {
		this.popupRefresh = new popup();
		this.initLog();
		console.log('Initializing Launcher...');
		this.shortcut();
		await setBackground();
		this.initFrame();

		this.config = await config.GetConfig().catch(err => err);
		if (this.config.error) return this.errorConnect();

		this.db = new database();
		await this.initConfigClient();
		await this.createPanels(Login, Home, Settings);
		await this.startLauncher();
	}

	/* ╔════════════════════════════════════════════════════╗
	   ║  🧾 LOGGER & SHORTCUTS                             ║
	   ╚════════════════════════════════════════════════════╝ */
	initLog() {
		// Active / désactive les DevTools (Ctrl+Shift+I ou F12)
		document.addEventListener('keydown', e => {
			if ((e.ctrlKey && e.shiftKey && e.code === 'KeyI') || e.code === 'F12') {
				ipcRenderer.send('main-window-dev-tools-close');
				ipcRenderer.send('main-window-dev-tools');
			}
		});
		new logger(pkg.name, '#7289da');
	}

	shortcut() {
		// Ferme la fenêtre avec Ctrl + W
		document.addEventListener('keydown', e => {
			if (e.ctrlKey && e.key === 'w') ipcRenderer.send('main-window-close');
		});
	}

	/* ╔════════════════════════════════════════════════════╗
	   ║  ⚠️  CONNECTION ERROR HANDLER                      ║
	   ╚════════════════════════════════════════════════════╝ */
	errorConnect() {
		this.popupRefresh.openPopup({
			title: this.config.error.code,
			content: this.config.error.message,
			color: 'red',
			exit: true,
			options: true,
		});
	}

	/* ╔════════════════════════════════════════════════════╗
	   ║  🪟 FRAME CONTROLS                                 ║
	   ╚════════════════════════════════════════════════════╝ */
	initFrame() {
		console.log('Initializing Frame...');
		const platform = os.platform() === 'darwin' ? 'darwin' : 'other';
		const frameEl = document.querySelector(`.${platform} .frame`);
		frameEl.classList.toggle('hide');

		// Bouton "Minimize"
		frameEl.querySelector('#minimize').addEventListener('click', () =>
			ipcRenderer.send('main-window-minimize')
		);

		// Bouton "Maximize / Restore"
		const maximize = frameEl.querySelector('#maximize');
		let maximized = false;
		maximize.addEventListener('click', () => {
			ipcRenderer.send('main-window-maximize');
			maximized = !maximized;
			maximize.classList.toggle('icon-maximize');
			maximize.classList.toggle('icon-restore-down');
		});

		// Bouton "Close"
		frameEl.querySelector('#close').addEventListener('click', () =>
			ipcRenderer.send('main-window-close')
		);
	}

	/* ╔════════════════════════════════════════════════════╗
	   ║  ⚙️  CLIENT CONFIG INITIALIZATION                  ║
	   ╚════════════════════════════════════════════════════╝ */
	async initConfigClient() {
		console.log('Initializing Config Client...');
		let configClient = await this.db.readData('configClient');

		if (!configClient) {
			await this.db.createData('configClient', {
				account_selected: null,
				instance_selct: null,
				java_config: { java_path: null, java_memory: { min: 4, max: 16 } },
				game_config: { screen_size: { width: 1980, height: 1080 } },
				launcher_config: {
					download_multi: 5,
					theme: 'sombre',
					closeLauncher: 'close-launcher',
					intelEnabledMac: true,
				},
			});
		}
	}

	/* ╔════════════════════════════════════════════════════╗
	   ║  🧩 PANEL CREATION & INITIALIZATION                ║
	   ╚════════════════════════════════════════════════════╝ */
	async createPanels(...panels) {
		const panelsElem = document.querySelector('.panels');
		const panelPromises = panels.map(async panel => {
			console.log(`Initializing ${panel.name} Panel...`);
			const div = document.createElement('div');
			div.classList.add('panel', panel.id);
			const htmlPath = `${__dirname}/panels/${panel.id}.html`;
			div.innerHTML = await fs.readFile(htmlPath, 'utf8');
			panelsElem.appendChild(div);
			await new panel().init(this.config);
		});
		await Promise.all(panelPromises);
	}

	/* ╔════════════════════════════════════════════════════╗
	   ║  🔐 ACCOUNT MANAGEMENT & LAUNCH SEQUENCE           ║
	   ╚════════════════════════════════════════════════════╝ */
	async startLauncher() {
		let accounts = await this.db.readAllData('accounts');
		let configClient = await this.db.readData('configClient');
		let account_selected = configClient?.account_selected;

		if (accounts?.length) {
			for (const account of accounts) {
				const account_ID = account.ID;
				if (account.error) {
					await this.db.deleteData('accounts', account_ID);
					continue;
				}

				if (account.meta.type === 'Xbox') {
					console.log(`Account Type : ${account.meta.type} | Username : ${account.name}`);
					this.popupRefresh.openPopup({
						title: 'Connexion',
						content: `Type de compte : ${account.meta.type} | Utilisateur : ${account.name}`,
						color: 'var(--dark)',
						background: false,
					});

					const refreshAccount = await new Microsoft(this.config.client_id)
						.refresh(account)
						.catch(err => ({ error: true, errorMessage: err.message }));

					if (refreshAccount.error) {
						await this.db.deleteData('accounts', account_ID);
						if (account_ID === account_selected) {
							configClient.account_selected = null;
							await this.db.updateData('configClient', configClient);
						}
						console.error(`[Account] ${account.name}: ${refreshAccount.errorMessage}`);
						continue;
					}

					refreshAccount.ID = account_ID;
					await this.db.updateData('accounts', refreshAccount, account_ID);
					await addAccount(refreshAccount);
					if (account_ID === account_selected) await accountSelect(refreshAccount);
				}
			}

			accounts = await this.db.readAllData('accounts');
			configClient = await this.db.readData('configClient');
			account_selected = configClient?.account_selected;

			if (!account_selected && accounts.length) {
				const uuid = accounts[0].ID;
				configClient.account_selected = uuid;
				await this.db.updateData('configClient', configClient);
				await accountSelect(accounts[0]);
			}

			if (!accounts.length) {
				config.account_selected = null;
				await this.db.updateData('configClient', config);
				this.popupRefresh.closePopup();
				return changePanel('login');
			}

			this.popupRefresh.closePopup();
			await changePanel('home');
		} else {
			this.popupRefresh.closePopup();
			await changePanel('login');
		}
	}
}

// ╔════════════════════════════════════════════════════╗
// ║  🧠 EXECUTION ENTRY POINT                          ║
// ╚════════════════════════════════════════════════════╝
new Launcher().init();