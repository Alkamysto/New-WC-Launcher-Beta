/**
 * 🧩 Settings Page Manager
 * ----------------------------------------------------------
 * Author  : Luuxis
 * License : CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 * Purpose : Handle frontend logic for the Settings page
 * ----------------------------------------------------------
 */

'use strict';

import {
	changePanel,
	accountSelect,
	database,
	Slider,
	config,
	setStatus,
	popup,
	appdata,
	setBackground,
} from '../utils.js';
const { ipcRenderer } = require('electron');
const os = require('os');

/* ╔════════════════════════════════════════════════════╗
   ║ ⚙️ SETTINGS CLASS                                     ║
   ╚════════════════════════════════════════════════════╝ */
class Settings {
	static id = 'settings';

	async init(config) {
		this.config = config;
		this.db = new database();

		this.navBTN();
		this.accounts();
		await Promise.all([this.ram(), this.javaPath(), this.resolution(), this.launcher()]);
	}

	/* ╔════════════════════════════════════════════╗
	   ║ 🔹 Navigation Button Logic                   ║
	   ╚════════════════════════════════════════════╝ */
	navBTN() {
		document.querySelector('.nav-box')?.addEventListener('click', (e) => {
			const button = e.target.closest('.nav-settings-btn');
			if (!button) return;

			const id = button.id;
			if (id === 'save') return changePanel('home');

			const activeBTN = document.querySelector('.active-settings-BTN');
			const activeContainer = document.querySelector('.active-container-settings');

			activeBTN?.classList.remove('active-settings-BTN');
			button.classList.add('active-settings-BTN');

			activeContainer?.classList.remove('active-container-settings');
			document.querySelector(`#${id}-tab`)?.classList.add('active-container-settings');
		});
	}

	/* ╔════════════════════════════════════════════╗
	   ║ 👤 Account Management                        ║
	   ╚════════════════════════════════════════════╝ */
	accounts() {
		document.querySelector('.accounts-list')?.addEventListener('click', async (e) => {
			const popupAccount = new popup();
			try {
				const id = e.target.id;

				if (e.target.classList.contains('account')) {
					popupAccount.openPopup({ title: 'Connexion en cours', content: 'Veuillez patienter...', color: 'var(--dark)' });

					if (id === 'add') return changePanel('login');

					const account = await this.db.readData('accounts', id);
					const configClient = await this.setInstance(account);

					await accountSelect(account);
					configClient.account_selected = account.ID;
					await this.db.updateData('configClient', configClient);
				}

				if (e.target.classList.contains('delete-profile')) {
					popupAccount.openPopup({ title: 'Suppression en cours', content: 'Veuillez patienter...', color: 'var(--dark)' });

					await this.db.deleteData('accounts', id);
					const accountList = document.querySelector('.accounts-list');
					accountList?.removeChild(document.getElementById(id));

					const remainingAccounts = accountList?.children.length || 0;
					if (remainingAccounts === 1) return changePanel('login');

					const configClient = await this.db.readData('configClient');
					if (configClient.account_selected === id) {
						const allAccounts = await this.db.readAllData('accounts');
						const newAccount = allAccounts[0];

						configClient.account_selected = newAccount.ID;
						await accountSelect(newAccount);
						const newInstanceSelect = await this.setInstance(newAccount);
						configClient.instance_selct = newInstanceSelect.instance_selct;
						await this.db.updateData('configClient', configClient);
					}
				}
			} catch (err) {
				console.error(err);
			} finally {
				popupAccount.closePopup();
			}
		});
	}

	/* ╔════════════════════════════════════════════╗
	   ║ 🌐 Instance / Whitelist Logic               ║
	   ╚════════════════════════════════════════════╝ */
	async setInstance(auth) {
		const configClient = await this.db.readData('configClient');
		const instanceSelect = configClient.instance_selct;
		const instancesList = await config.getInstanceList();

		for (const instance of instancesList) {
			if (!instance.whitelistActive) continue;
			const whitelistMatch = instance.whitelist?.includes(auth.name);
			if (!whitelistMatch && instance.name === instanceSelect) {
				const newInstance = instancesList.find((i) => !i.whitelistActive);
				configClient.instance_selct = newInstance?.name || instanceSelect;
				await setStatus(newInstance?.status || 'offline');
			}
		}

		return configClient;
	}

	/* ╔════════════════════════════════════════════╗
	   ║ 💾 RAM Management                            ║
	   ╚════════════════════════════════════════════╝ */
	async ram() {
		const configClient = await this.db.readData('configClient');
		const totalMem = Math.trunc((os.totalmem() / 1073741824) * 10) / 10;
		const freeMem = Math.trunc((os.freemem() / 1073741824) * 10) / 10;

		document.getElementById('total-ram').textContent = `${totalMem} Go`;
		document.getElementById('free-ram').textContent = `${freeMem} Go`;

		const sliderDiv = document.querySelector('.memory-slider');
		sliderDiv?.setAttribute('max', Math.trunc((80 * totalMem) / 100));

		let ram = configClient?.java_config?.java_memory || { ramMin: 4, ramMax: 16 };
		if (totalMem < ram.ramMin) {
			configClient.java_config.java_memory = { ramMin: 4, ramMax: 16 };
			await this.db.updateData('configClient', configClient);
			ram = { ramMin: 4, ramMax: 16 };
		}

		const slider = new Slider('.memory-slider', parseFloat(ram.ramMin), parseFloat(ram.ramMax));
		const minSpan = document.querySelector('.slider-touch-left span');
		const maxSpan = document.querySelector('.slider-touch-right span');

		if (minSpan) minSpan.setAttribute('value', `${ram.ramMin} Go`);
		if (maxSpan) maxSpan.setAttribute('value', `${ram.ramMax} Go`);

		slider.on('change', async (min, max) => {
			const cfg = await this.db.readData('configClient');
			minSpan?.setAttribute('value', `${min} Go`);
			maxSpan?.setAttribute('value', `${max} Go`);
			cfg.java_config.java_memory = { ramMin: min, ramMax: max };
			await this.db.updateData('configClient', cfg);
		});
	}

	/* ╔════════════════════════════════════════════╗
	   ║ ☕ Java Path Management                        ║
	   ╚════════════════════════════════════════════╝ */
	async javaPath() {
		const javaPathText = document.querySelector('.java-path-txt');
		javaPathText.textContent = `${await appdata()}/${process.platform === 'darwin' ? this.config.dataDirectory : `.${this.config.dataDirectory}`}/runtime`;

		const configClient = await this.db.readData('configClient');
		const javaPath = configClient?.java_config?.java_path || 'Utiliser la version de Java livrée avec le launcher';
		const javaPathInputTxt = document.querySelector('.java-path-input-text');
		const javaPathInputFile = document.querySelector('.java-path-input-file');
		if (javaPathInputTxt) javaPathInputTxt.value = javaPath;

		document.querySelector('.java-path-set')?.addEventListener('click', async () => {
			javaPathInputFile.value = '';
			javaPathInputFile.click();

			await new Promise((resolve) => {
				const interval = setInterval(() => {
					if (javaPathInputFile.value !== '') resolve(clearInterval(interval));
				}, 100);
			});

			const file = javaPathInputFile.files?.[0]?.path;
			if (file && (file.replace('.exe', '').endsWith('java') || file.replace('.exe', '').endsWith('javaw'))) {
				const cfg = await this.db.readData('configClient');
				javaPathInputTxt.value = file;
				cfg.java_config.java_path = file;
				await this.db.updateData('configClient', cfg);
			} else alert('Le nom du fichier doit être java ou javaw');
		});

		document.querySelector('.java-path-reset')?.addEventListener('click', async () => {
			const cfg = await this.db.readData('configClient');
			if (javaPathInputTxt) javaPathInputTxt.value = 'Utiliser la version de Java livrée avec le launcher';
			cfg.java_config.java_path = null;
			await this.db.updateData('configClient', cfg);
		});
	}

	/* ╔════════════════════════════════════════════╗
	   ║ 🖥️ Resolution Settings                         ║
	   ╚════════════════════════════════════════════╝ */
	async resolution() {
		const configClient = await this.db.readData('configClient');
		const resolution = configClient?.game_config?.screen_size || { width: 1920, height: 1080 };

		const width = document.querySelector('.width-size');
		const height = document.querySelector('.height-size');
		const resetBtn = document.querySelector('.size-reset');

		if (width) width.value = resolution.width;
		if (height) height.value = resolution.height;

		width?.addEventListener('change', async () => {
			const cfg = await this.db.readData('configClient');
			cfg.game_config.screen_size.width = width.value;
			await this.db.updateData('configClient', cfg);
		});

		height?.addEventListener('change', async () => {
			const cfg = await this.db.readData('configClient');
			cfg.game_config.screen_size.height = height.value;
			await this.db.updateData('configClient', cfg);
		});

		resetBtn?.addEventListener('click', async () => {
			const cfg = await this.db.readData('configClient');
			cfg.game_config.screen_size = { width: 1920, height: 1080 };
			if (width) width.value = 1920;
			if (height) height.value = 1080;
			await this.db.updateData('configClient', cfg);
		});
	}

	/* ╔════════════════════════════════════════════╗
	   ║ 🚀 Launcher Settings                          ║
	   ╚════════════════════════════════════════════╝ */
	async launcher() {
		const configClient = await this.db.readData('configClient');

		/* ─── Max Download Files ─── */
		const maxDownloadFilesInput = document.querySelector('.max-files');
		const maxDownloadFilesReset = document.querySelector('.max-files-reset');
		if (maxDownloadFilesInput) maxDownloadFilesInput.value = configClient?.launcher_config?.download_multi || 3;

		maxDownloadFilesInput?.addEventListener('change', async () => {
			const cfg = await this.db.readData('configClient');
			cfg.launcher_config.download_multi = maxDownloadFilesInput.value;
			await this.db.updateData('configClient', cfg);
		});

		maxDownloadFilesReset?.addEventListener('click', async () => {
			const cfg = await this.db.readData('configClient');
			maxDownloadFilesInput.value = 5;
			cfg.launcher_config.download_multi = 5;
			await this.db.updateData('configClient', cfg);
		});

		/* ─── Theme Selection ─── */
		const themeBox = document.querySelector('.theme-box');
		let theme = configClient?.launcher_config?.theme || 'auto';

		document.querySelector(`.theme-btn-${theme === 'auto' ? 'auto' : theme === 'dark' ? 'sombre' : 'clair'}`)?.classList.add('active-theme');

		themeBox?.addEventListener('click', async (e) => {
			const clickedBtn = e.target.closest('.theme-btn');
			if (!clickedBtn || clickedBtn.classList.contains('active-theme')) return;

			document.querySelector('.active-theme')?.classList.remove('active-theme');

			if (clickedBtn.classList.contains('theme-btn-auto')) {
				await setBackground();
				theme = 'auto';
			} else if (clickedBtn.classList.contains('theme-btn-sombre')) {
				await setBackground(true);
				theme = 'dark';
			} else if (clickedBtn.classList.contains('theme-btn-clair')) {
				await setBackground(false);
				theme = 'light';
			}

			clickedBtn.classList.add('active-theme');
			const cfg = await this.db.readData('configClient');
			cfg.launcher_config.theme = theme;
			await this.db.updateData('configClient', cfg);
		});

		/* ─── Close Launcher Options ─── */
		const closeBox = document.querySelector('.close-box');
		const closeLauncher = configClient?.launcher_config?.closeLauncher || 'close-launcher';

		document.querySelector(`.${closeLauncher}`)?.classList.add('active-close');

		closeBox?.addEventListener('click', async (e) => {
			const clickedBtn = e.target.closest('.close-btn');
			if (!clickedBtn || clickedBtn.classList.contains('active-close')) return;

			document.querySelector('.active-close')?.classList.remove('active-close');

			const cfg = await this.db.readData('configClient');

			if (clickedBtn.classList.contains('close-launcher')) cfg.launcher_config.closeLauncher = 'close-launcher';
			else if (clickedBtn.classList.contains('close-all')) cfg.launcher_config.closeLauncher = 'close-all';
			else if (clickedBtn.classList.contains('close-none')) cfg.launcher_config.closeLauncher = 'close-none';

			clickedBtn.classList.add('active-close');
			await this.db.updateData('configClient', cfg);
		});
	}
}

/* ╔════════════════════════════════════════════════════╗
   ║ 🚀 EXPORT SETTINGS CLASS                             ║
   ╚════════════════════════════════════════════════════╝ */
export default Settings;