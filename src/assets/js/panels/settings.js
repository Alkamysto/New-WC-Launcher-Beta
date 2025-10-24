const os = require('os');
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

class Settings {
	static id = 'settings';

	async init(cfg) {
		this.config = cfg;
		this.db = new database();

		this.initNav();
		this.initAccounts();
		await this.initRAM();
		await this.initJavaPath();
		await this.initResolution();
		await this.initLauncher();
	}

	initNav() {
		const navBox = document.querySelector('.nav-box');
		if (!navBox) return;

		navBox.addEventListener('click', (e) => {
			const button = e.target.closest('.nav-settings-btn');
			if (!button) return;

			const id = button.id;

			if (id === 'save') return changePanel('home');

			document
				.querySelector('.active-settings-BTN')
				?.classList.remove('active-settings-BTN');
			button.classList.add('active-settings-BTN');

			document
				.querySelector('.active-container-settings')
				?.classList.remove('active-container-settings');
			document
				.querySelector(`#${id}-tab`)
				?.classList.add('active-container-settings');
		});
	}

	initAccounts() {
		const accountsList = document.querySelector('.accounts-list');
		if (!accountsList) return;

		accountsList.addEventListener('click', async (e) => {
			const popupAccount = new popup();
			try {
				const id = e.target.id;

				if (e.target.classList.contains('account')) {
					popupAccount.openPopup({
						title: 'Connexion en cours',
						content: 'Veuillez patienter...',
						color: 'var(--dark)',
					});

					if (id === 'add') return changePanel('login');

					const account = await this.db.readData('accounts', id);
					const configClient = await this.setInstance(account);
					await accountSelect(account);
					configClient.account_selected = account.ID;
					await this.db.updateData('configClient', configClient);
					return;
				}

				if (e.target.classList.contains('delete-profile')) {
					popupAccount.openPopup({
						title: 'Suppression en cours',
						content: 'Veuillez patienter...',
						color: 'var(--dark)',
					});
					await this.db.deleteData('accounts', id);
					document.getElementById(id)?.remove();

					const remainingAccounts = await this.db.readAllData('accounts');
					if (!remainingAccounts.length) return changePanel('login');

					const configClient = await this.db.readData('configClient');
					if (configClient.account_selected === id) {
						const firstAccount = remainingAccounts[0];
						configClient.account_selected = firstAccount.ID;
						await accountSelect(firstAccount);
						const newInstance = await this.setInstance(firstAccount);
						configClient.instance_selct = newInstance.instance_selct;
						await this.db.updateData('configClient', configClient);
					}
					return;
				}
			} catch (err) {
				console.error('💥 Accounts error:', err);
			} finally {
				popupAccount.closePopup();
			}
		});
	}

	async setInstance(auth) {
		const configClient = await this.db.readData('configClient');
		const instanceSelect = configClient.instance_selct;
		const instancesList = await config.getInstanceList();

		for (const instance of instancesList) {
			if (
				instance.whitelistActive &&
				!(instance.whitelist || []).includes(auth.name)
			) {
				if (instance.name === instanceSelect) {
					const fallback =
						instancesList.find((i) => !i.whitelistActive) || instancesList[0];
					if (fallback) {
						configClient.instance_selct = fallback.name;
						await setStatus(fallback.status);
					}
				}
			}
		}
		return configClient;
	}

	async initRAM() {
		const configClient = await this.db.readData('configClient');
		const totalMem = Math.floor(os.totalmem() / 107374182.4) / 10; // en Go avec 1 décimale
		const freeMem = Math.floor(os.freemem() / 107374182.4) / 10;

		document.getElementById('total-ram').textContent = `${totalMem} Go`;
		document.getElementById('free-ram').textContent = `${freeMem} Go`;

		const sliderDiv = document.querySelector('.memory-slider');
		if (!sliderDiv) return;

		sliderDiv.setAttribute('max', Math.trunc((80 * totalMem) / 100));

		let ram = config?.java_config?.java_memory
			? {
					ramMin: config.java_config.java_memory.min,
					ramMax: config.java_config.java_memory.max,
				}
			: { ramMin: '4', ramMax: '16' };

		if (totalMem < ram.ramMin) {
			configClient.java_config.java_memory = { min: 4, max: 16 };
			await this.db.updateData('configClient', configClient);
			ram = { ramMin: 4, ramMax: 16 };
		}

		const slider = new Slider(
			'.memory-slider',
			parseFloat(ram.ramMin),
			parseFloat(ram.ramMax)
		);
		const minSpan = document.querySelector('.slider-touch-left span');
		const maxSpan = document.querySelector('.slider-touch-right span');

		minSpan?.setAttribute('value', `${ram.ramMin} Go`);
		maxSpan?.setAttribute('value', `${ram.ramMax} Go`);

		slider.on('change', async (min, max) => {
			const configClient = await this.db.readData('configClient');
			minSpan?.setAttribute('value', `${min} Go`);
			maxSpan?.setAttribute('value', `${max} Go`);
			configClient.java_config.java_memory = { min, max };
			await this.db.updateData('configClient', configClient);
		});
	}

	async initJavaPath() {
		const javaPathText = document.querySelector('.java-path-txt');
		if (!javaPathText) return;
		javaPathText.textContent = `${await appdata()}/${process.platform === 'darwin' ? this.config.dataDirectory : `.${this.config.dataDirectory}`}/runtime`;

		const configClient = await this.db.readData('configClient');
		const javaPath =
			configClient?.java_config?.java_path ||
			'Utiliser la version de Java livrée avec le launcher';
		const javaPathInputTxt = document.querySelector('.java-path-input-text');
		const javaPathInputFile = document.querySelector('.java-path-input-file');

		if (javaPathInputTxt) javaPathInputTxt.value = javaPath;

		document
			.querySelector('.java-path-set')
			?.addEventListener('click', async () => {
				javaPathInputFile.value = '';
				javaPathInputFile.click();

				await new Promise((resolve) => {
					const interval = setInterval(() => {
						if (javaPathInputFile.value) {
							clearInterval(interval);
							resolve();
						}
					}, 100);
				});

				if (
					!javaPathInputFile.value.toLowerCase().endsWith('java') &&
					!javaPathInputFile.value.toLowerCase().endsWith('javaw')
				) {
					return alert('Le nom du fichier doit être java ou javaw');
				}

				const file = javaPathInputFile.files[0]?.path;
				if (!file) return;

				javaPathInputTxt.value = file;
				configClient.java_config.java_path = file;
				await this.db.updateData('configClient', configClient);
			});

		document
			.querySelector('.java-path-reset')
			?.addEventListener('click', async () => {
				javaPathInputTxt.value =
					'Utiliser la version de Java livrée avec le launcher';
				configClient.java_config.java_path = null;
				await this.db.updateData('configClient', configClient);
			});
	}

	async initResolution() {
		const configClient = await this.db.readData('configClient');
		const resolution = configClient?.game_config?.screen_size || {
			width: 1920,
			height: 1080,
		};

		const widthInput = document.querySelector('.width-size');
		const heightInput = document.querySelector('.height-size');
		const resetBtn = document.querySelector('.size-reset');

		if (!widthInput || !heightInput || !resetBtn) return;

		widthInput.value = resolution.width;
		heightInput.value = resolution.height;

		widthInput.addEventListener('change', async () => {
			const configClient = await this.db.readData('configClient');
			configClient.game_config.screen_size.width = widthInput.value;
			await this.db.updateData('configClient', configClient);
		});

		heightInput.addEventListener('change', async () => {
			const configClient = await this.db.readData('configClient');
			configClient.game_config.screen_size.height = heightInput.value;
			await this.db.updateData('configClient', configClient);
		});

		resetBtn.addEventListener('click', async () => {
			widthInput.value = '1920';
			heightInput.value = '1080';
			const configClient = await this.db.readData('configClient');
			configClient.game_config.screen_size = { width: '1920', height: '1080' };
			await this.db.updateData('configClient', configClient);
		});
	}

	async initLauncher() {
		const configClient = await this.db.readData('configClient');

		const maxFilesInput = document.querySelector('.max-files');
		const maxFilesReset = document.querySelector('.max-files-reset');
		if (maxFilesInput && maxFilesReset) {
			maxFilesInput.value = configClient?.launcher_config?.download_multi || 5;

			maxFilesInput.addEventListener('change', async () => {
				const configClient = await this.db.readData('configClient');
				configClient.launcher_config.download_multi = maxFilesInput.value;
				await this.db.updateData('configClient', configClient);
			});

			maxFilesReset.addEventListener('click', async () => {
				maxFilesInput.value = 5;
				const configClient = await this.db.readData('configClient');
				configClient.launcher_config.download_multi = 5;
				await this.db.updateData('configClient', configClient);
			});
		}

		const themeBox = document.querySelector('.theme-box');
		if (themeBox) {
			let theme = configClient?.launcher_config?.theme || 'auto';
			document
				.querySelector(
					`.theme-btn-${theme === 'dark' ? 'sombre' : theme === 'light' ? 'clair' : 'auto'}`
				)
				?.classList.add('active-theme');

			themeBox.addEventListener('click', async (e) => {
				const btn = e.target.closest('.theme-btn');
				if (!btn || btn.classList.contains('active-theme')) return;

				document
					.querySelector('.active-theme')
					?.classList.remove('active-theme');

				if (btn.classList.contains('theme-btn-auto')) {
					await setBackground();
					theme = 'auto';
				} else if (btn.classList.contains('theme-btn-sombre')) {
					await setBackground(true);
					theme = 'dark';
				} else if (btn.classList.contains('theme-btn-clair')) {
					await setBackground(false);
					theme = 'light';
				}

				btn.classList.add('active-theme');

				const configClient = await this.db.readData('configClient');
				configClient.launcher_config.theme = theme;
				await this.db.updateData('configClient', configClient);
			});
		}

		const closeBox = document.querySelector('.close-box');
		if (closeBox) {
			let closeLauncher =
				configClient?.launcher_config?.closeLauncher || 'close-launcher';
			document
				.querySelector(`.${closeLauncher.replace('close-', 'close-')}`)
				?.classList.add('active-close');

			closeBox.addEventListener('click', async (e) => {
				const btn = e.target.closest('.close-btn');
				if (!btn || btn.classList.contains('active-close')) return;

				document
					.querySelector('.active-close')
					?.classList.remove('active-close');

				const configClient = await this.db.readData('configClient');

				if (btn.classList.contains('close-launcher'))
					configClient.launcher_config.closeLauncher = 'close-launcher';
				else if (btn.classList.contains('close-all'))
					configClient.launcher_config.closeLauncher = 'close-all';
				else if (btn.classList.contains('close-none'))
					configClient.launcher_config.closeLauncher = 'close-none';

				btn.classList.add('active-close');
				await this.db.updateData('configClient', configClient);
			});
		}
	}
}

export default Settings;
