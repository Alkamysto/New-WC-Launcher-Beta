const { ipcRenderer } = require('electron');
import {
	popup,
	database,
	changePanel,
	accountSelect,
	addAccount,
	config,
	setStatus,
} from '../utils.js';

class Login {
	static id = 'login';

	async init(cfg) {
		try {
			this.config = cfg;
			this.db = new database();

			if (typeof this.config?.online === 'boolean') {
				await this.initMicrosoftLogin();
			}
		} catch (err) {
			console.error('💥 Login.init error:', err);
		}
	}

	async initMicrosoftLogin() {
		const popupLogin = new popup();
		const loginHome = document.querySelector('.login-home');
		const microsoftBtn = document.querySelector('.connect-home');

		if (loginHome) loginHome.style.display = 'block';
		if (!microsoftBtn) return console.warn('⚠️ Bouton Microsoft introuvable');

		if (this.microsoftHandler)
			microsoftBtn.removeEventListener('click', this.microsoftHandler);

		this.microsoftHandler = async () => {
			popupLogin.openPopup({
				title: '🔄 Connexion',
				content: 'Veuillez patienter...',
				color: 'var(--dark)',
			});

			try {
				const accountConnect = await ipcRenderer.invoke(
					'Microsoft-window',
					this.config.client_id
				);

				if (!accountConnect || accountConnect === 'cancel') {
					popupLogin.closePopup();
					return;
				}

				const ownsMinecraft = await this.checkMinecraftOwnership(
					accountConnect.access_token
				);
				if (!ownsMinecraft) {
					popupLogin.openPopup({
						title: '❌ Erreur',
						content: 'Ce compte Microsoft ne possède pas de compte Minecraft.',
						color: 'var(--red)',
						options: true,
					});
					return;
				}

				await this.saveData(accountConnect);
				popupLogin.closePopup();
			} catch (err) {
				console.error('💥 Microsoft login error:', err);
				popupLogin.openPopup({
					title: '💥 Erreur',
					content: err?.message || String(err),
					options: true,
				});
			}
		};

		microsoftBtn.addEventListener('click', this.microsoftHandler);
	}

	async checkMinecraftOwnership(accessToken) {
		if (!accessToken || typeof accessToken !== 'string') return false;

		const url = 'https://api.minecraftservices.com/entitlements/mcstore';
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 8000);

		try {
			const res = await fetch(url, {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${accessToken}`,
					Accept: 'application/json',
				},
				signal: controller.signal,
			});
			clearTimeout(timeout);

			if (!res.ok) {
				console.warn('⚠️ Minecraft ownership check failed:', res.status);
				return false;
			}

			const data = await res.json();
			return Array.isArray(data.items) && data.items.length > 0;
		} catch (err) {
			clearTimeout(timeout);
			console.error('💥 Minecraft ownership error:', err);
			return false;
		}
	}

	async saveData(connectionData) {
		if (!connectionData || typeof connectionData !== 'object') {
			console.error('💥 Données de connexion invalides');
			return;
		}

		try {
			const configClient = (await this.db.readData('configClient')) || {};
			const allAccounts = await this.db.readAllData('accounts');

			const existing = allAccounts.find(
				(acc) =>
					(acc.name && acc.name === connectionData.name) ||
					(acc.uuid && acc.uuid === connectionData.uuid)
			);

			if (existing) {
				const popupInfo = new popup();
				popupInfo.openPopup({
					title: 'ℹ️ Compte existant',
					content: `Le compte "${connectionData.name}" existe déjà.`,
					color: 'green',
					background: false,
				});

				configClient.account_selected = existing.ID;
				await this.db.updateData('configClient', configClient);
				await addAccount(existing);
				await accountSelect(existing);
				await changePanel('home');
				return;
			}

			const account = await this.db.createData('accounts', connectionData);
			configClient.account_selected = account.ID;

			const instancesList = await config.getInstanceList();
			const instanceSelect = configClient.instance_selct;

			if (Array.isArray(instancesList)) {
				for (const instance of instancesList) {
					if (instance.whitelistActive) {
						const whitelisted = (instance.whitelist || []).includes(
							account.name
						);
						if (!whitelisted && instance.name === instanceSelect) {
							const fallback =
								instancesList.find((i) => !i.whitelistActive) ||
								instancesList[0];
							if (fallback) {
								configClient.instance_selct = fallback.name;
								await setStatus(fallback.status);
							}
						}
					}
				}
			}

			await this.db.updateData('configClient', configClient);
			await addAccount(account);
			await accountSelect(account);
			await changePanel('home');
		} catch (err) {
			console.error('💥 saveData error:', err);
			const p = new popup();
			p.openPopup({
				title: '💥 Erreur lors de la sauvegarde',
				content: err?.message || String(err),
				options: true,
			});
		}
	}

	destroy() {
		const microsoftBtn = document.querySelector('.connect-home');
		if (microsoftBtn && this.microsoftHandler) {
			microsoftBtn.removeEventListener('click', this.microsoftHandler);
			this.microsoftHandler = null;
		}
	}
}

export default Login;
