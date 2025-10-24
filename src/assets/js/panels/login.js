/**
 * 🧩 Login Page Manager
 * ----------------------------------------------------------
 * Author  : Luuxis
 * License : CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 * Purpose : Frontend management for login.html (Microsoft login)
 * ----------------------------------------------------------
 */

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

	/* ╔════════════════════════════════════════════════════╗
	   ║  🔑  INITIALIZATION                               ║
	   ╚════════════════════════════════════════════════════╝ */
	async init(config) {
		this.config = config;
		this.db = new database();

		if (typeof this.config.online === 'boolean') {
			await this.getMicrosoft();
		}
	}

	/* ╔════════════════════════════════════════════════════╗
	   ║  🌐  MICROSOFT LOGIN                               ║
	   ╚════════════════════════════════════════════════════╝ */
	async getMicrosoft() {
		console.log('Initializing Microsoft login...');
		const popupLogin = new popup();
		const loginHome = document.querySelector('.login-home');
		const microsoftBtn = document.querySelector('.connect-home');

		if (loginHome) loginHome.style.display = 'block';
		if (!microsoftBtn) return;

		microsoftBtn.addEventListener('click', async () => {
			popupLogin.openPopup({
				title: 'Connexion en cours',
				content: 'Veuillez patienter...',
				color: 'var(--dark)',
			});

			try {
				const account_connect = await ipcRenderer.invoke('Microsoft-window', this.config.client_id);
				if (!account_connect || account_connect === 'cancel') return popupLogin.closePopup();

				const ownsMinecraft = await this.checkMinecraftOwnership(account_connect.access_token);
				if (!ownsMinecraft) {
					return popupLogin.openPopup({
						title: 'Erreur',
						content: 'Ce compte Microsoft ne possède pas de compte Minecraft.',
						color: 'var(--red)',
						options: true,
					});
				}

				await this.saveData(account_connect);
			} catch (err) {
				popupLogin.openPopup({
					title: 'Erreur',
					content: err?.message || err,
					options: true,
				});
			} finally {
				popupLogin.closePopup();
			}
		});
	}

	/* ╔════════════════════════════════════════════════════╗
	   ║  🎮  CHECK MINECRAFT OWNERSHIP                     ║
	   ╚════════════════════════════════════════════════════╝ */
	async checkMinecraftOwnership(accessToken) {
		try {
			const response = await fetch('https://api.minecraftservices.com/entitlements/mcstore', {
				headers: { Authorization: `Bearer ${accessToken}` },
			});
			const data = await response.json();
			return Array.isArray(data.items) && data.items.length > 0;
		} catch (error) {
			console.error('Erreur de vérification Minecraft:', error);
			return false;
		}
	}

	/* ╔════════════════════════════════════════════════════╗
	   ║  💾  SAVE ACCOUNT DATA                              ║
	   ╚════════════════════════════════════════════════════╝ */
	async saveData(connectionData) {
		let configClient = await this.db.readData('configClient');
		const existingAccounts = await this.db.readAllData('accounts');
		const existingAccount = existingAccounts.find(acc => acc.name === connectionData.name);

		// Si le compte existe déjà
		if (existingAccount) {
			const popupInfo = new popup();
			popupInfo.openPopup({
				title: 'Compte existant',
				content: `Le compte "${connectionData.name}" existe déjà. Utilisation du compte existant pour préserver votre inventaire.`,
				color: 'green',
				background: false,
			});

			configClient.account_selected = existingAccount.ID;
			await this.db.updateData('configClient', configClient);
			await Promise.all([
				addAccount(existingAccount),
				accountSelect(existingAccount),
				changePanel('home')
			]);
			return;
		}

		// Création d’un nouveau compte
		const account = await this.db.createData('accounts', connectionData);
		const instancesList = await config.getInstanceList();
		configClient.account_selected = account.ID;

		// Vérification de la whitelist et sélection de l’instance
		if (instancesList.length > 0) {
			const instanceSelect = configClient.instance_selct;
			for (const instance of instancesList) {
				if (!instance.whitelistActive) continue;
				const whitelistMatch = instance.whitelist?.includes(account.name);
				if (!whitelistMatch && instance.name === instanceSelect) {
					const newInstanceSelect = instancesList.find(i => !i.whitelistActive);
					configClient.instance_selct = newInstanceSelect?.name || instanceSelect;
					await setStatus(newInstanceSelect?.status || 'offline');
					break;
				}
			}
		}

		await this.db.updateData('configClient', configClient);
		await Promise.all([
			addAccount(account),
			accountSelect(account),
			changePanel('home')
		]);
	}
}

/* ╔════════════════════════════════════════════════════╗
   ║ 🚀 EXPORT LOGIN CLASS                             ║
   ╚════════════════════════════════════════════════════╝ */
export default Login;