const { ipcRenderer } = require('electron');
const { Status } = require('minecraft-java-core');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const pkg = require('../package.json');

import config from './utils/config.js';
import database from './utils/database.js';
import logger from './utils/logger.js';
import popup from './utils/popup.js';
import Skin2D from './utils/skin.js';
import slider from './utils/slider.js';

async function setBackground(theme) {
	try {
		if (typeof theme === 'undefined') {
			const db = new database();
			const configClient = await db.readData('configClient');
			theme = configClient?.launcher_config?.theme || 'auto';
			theme = await ipcRenderer.invoke('is-dark-theme', theme);
		}

		const body = document.body;
		body.className = theme ? 'dark global' : 'light global';

		let background = '';

		const bgDir = path.join(
			__dirname,
			'assets/images/background',
			Math.random() < 0.005 ? 'easterEgg' : theme ? 'dark' : 'light'
		);

		if (fs.existsSync(bgDir)) {
			const backgrounds = fs.readdirSync(bgDir);
			if (backgrounds.length > 0) {
				const selected =
					backgrounds[Math.floor(Math.random() * backgrounds.length)];
				background =
					Math.random() < 0.005
						? `url(./assets/images/background/easterEgg/${selected})`
						: `linear-gradient(#00000080, #00000080), url(./assets/images/background/${theme ? 'dark' : 'light'}/${selected})`;
			}
		}

		body.style.backgroundImage = background || (theme ? '#000' : '#fff');
		body.style.backgroundSize = 'cover';
		body.style.backgroundRepeat = 'no-repeat';
	} catch (err) {
		console.error('💥 setBackground error:', err);
	}
}

async function changePanel(id) {
	try {
		const panel = document.querySelector(`.${id}`);
		const active = document.querySelector('.active');

		if (active && active !== panel) {
			const container = active.querySelector('.container');
			container.style.opacity = 0;
			container.style.transform = 'scale(0.95)';
			await new Promise((resolve) => setTimeout(resolve, 400));
			active.classList.remove('active');
			container.style.visibility = 'hidden';
		}

		panel.classList.add('active');
		const container = panel.querySelector('.container');
		container.style.visibility = 'visible';
		container.style.opacity = 1;
		setTimeout(() => {
			container.style.transform = 'scale(1)';
		}, 100);
	} catch (err) {
		console.error('💥 changePanel error:', err);
	}
}

async function appdata() {
	try {
		return await ipcRenderer.invoke('appData');
	} catch (err) {
		console.error('💥 appdata error:', err);
		return null;
	}
}

async function addAccount(data) {
	try {
		if (!data || !data.ID) return null;

		let existingElement = document.getElementById(data.ID);
		if (existingElement) return existingElement;

		let skinUrl = false;
		if (data?.profile?.skins?.[0]?.base64) {
			skinUrl = await new Skin2D().creatHeadTexture(
				data.profile.skins[0].base64
			);
		}

		const div = document.createElement('div');
		div.classList.add('account');
		div.id = data.ID;
		div.innerHTML = `
      <div class="profile-image" ${
				skinUrl ? `style="background-image: url(${skinUrl});"` : ''
			}></div>
      <div class="profile-infos">
        <div class="profile-pseudo">${data.name}</div>
        <div class="profile-uuid">${data.uuid}</div>
      </div>
      <div class="delete-profile" id="${data.ID}">
        <div class="icon-account-delete delete-profile-icon"></div>
      </div>
    `;

		return document.querySelector('.accounts-list')?.appendChild(div);
	} catch (err) {
		console.error('💥 addAccount error:', err);
		return null;
	}
}

async function accountSelect(data) {
	try {
		const account = document.getElementById(data.ID);
		if (!account) return;

		const activeAccount = document.querySelector('.account-select');
		if (activeAccount) activeAccount.classList.toggle('account-select');

		account.classList.add('account-select');
		if (data?.profile?.skins?.[0]?.base64) {
			await headplayer(data.profile.skins[0].base64);
		}
	} catch (err) {
		console.error('💥 accountSelect error:', err);
	}
}

async function headplayer(skinBase64) {
	try {
		const skinUrl = await new Skin2D().creatHeadTexture(skinBase64);
		document.querySelector('.player-head').style.backgroundImage =
			`url(${skinUrl})`;
	} catch (err) {
		console.error('💥 headplayer error:', err);
	}
}

async function setStatus(opt) {
	try {
		const nameServerEl = document.querySelector('.server-status-name');
		const statusServerEl = document.querySelector('.server-status-text');
		const playersOnlineEl = document.querySelector(
			'.status-player-count .player-count'
		);

		async function updateStatus() {
			if (!opt) {
				statusServerEl.innerHTML = 'Hors ligne - 0 ms';
				playersOnlineEl.innerHTML = '0';
				return;
			}

			const { ip, port, nameServer } = opt;
			nameServerEl.innerHTML = nameServer;

			try {
				const status = new Status(ip, port);
				const serverStatus = await status.getStatus();
				if (!serverStatus.error) {
					statusServerEl.classList.remove('red');
					statusServerEl.classList.add('green');
					document
						.querySelector('.status-player-count')
						.classList.remove('red');
					document.querySelector('.status-player-count').classList.add('green');
					statusServerEl.innerHTML = `En ligne - ${serverStatus.ms} ms`;
					playersOnlineEl.innerHTML = serverStatus.playersConnect;
				} else {
					throw new Error('Server offline');
				}
			} catch {
				statusServerEl.innerHTML = 'Hors ligne - 0 ms';
				playersOnlineEl.innerHTML = '0';
				statusServerEl.classList.remove('red');
				statusServerEl.classList.add('green');
				document.querySelector('.status-player-count').classList.remove('red');
				document.querySelector('.status-player-count').classList.add('green');
			}
		}

		await updateStatus();
		setInterval(updateStatus, 15000);
	} catch (err) {
		console.error('💥 setStatus error:', err);
	}
}

function generateDeterministicUUID(username) {
	try {
		const data = Buffer.from('OfflinePlayer:' + username, 'utf8');
		const hash = crypto.createHash('md5').update(data).digest();

		hash[6] = (hash[6] & 0x0f) | 0x30; // Version 3
		hash[8] = (hash[8] & 0x3f) | 0x80; // Variant

		const hex = hash.toString('hex');
		return [
			hex.substring(0, 8),
			hex.substring(8, 12),
			hex.substring(12, 16),
			hex.substring(16, 20),
			hex.substring(20, 32),
		].join('-');
	} catch (err) {
		console.error('💥 generateDeterministicUUID error:', err);
		return null;
	}
}

export {
	appdata,
	changePanel,
	config,
	database,
	logger,
	popup,
	setBackground,
	Skin2D,
	addAccount,
	accountSelect,
	slider as Slider,
	pkg,
	setStatus,
	generateDeterministicUUID,
};
