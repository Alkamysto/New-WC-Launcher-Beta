/**
 * 🧩 Launcher Utilities
 * ----------------------------------------------------------
 * Author  : Luuxis
 * License : CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 * Purpose : Core frontend utilities for the Minecraft Launcher
 * ----------------------------------------------------------
 */

const { ipcRenderer } = require('electron');
const { Status } = require('minecraft-java-core');
const fs = require('fs').promises;
const path = require('path');
const pkg = require('../package.json');

import config from './utils/config.js';
import database from './utils/database.js';
import logger from './utils/logger.js';
import popup from './utils/popup.js';
import { skin2D } from './utils/skin.js';
import slider from './utils/slider.js';

/* ╔════════════════════════════════════════════════════╗
   ║  🌄  DYNAMIC BACKGROUND MANAGEMENT                 ║
   ╚════════════════════════════════════════════════════╝ */
async function setBackground(theme) {
	if (typeof theme === 'undefined') {
		const db = new database();
		const configClient = await db.readData('configClient');
		theme = configClient?.launcher_config?.theme || 'auto';
		theme = await ipcRenderer.invoke('is-dark-theme', theme);
	}

	const body = document.body;
	body.className = theme ? 'dark global' : 'light global';

	let background;
	const basePath = path.join(__dirname, 'assets/images/background');

	// 🎉 Easter Egg chance (0.5%)
	const easterPath = path.join(basePath, 'easterEgg');
	if (await exists(easterPath) && Math.random() < 0.005) {
		const backgrounds = await fs.readdir(easterPath);
		const selected = backgrounds[Math.floor(Math.random() * backgrounds.length)];
		background = `url(./assets/images/background/easterEgg/${selected})`;
	} 
	// 🎨 Theme backgrounds
	else {
		const themeDir = path.join(basePath, theme ? 'dark' : 'light');
		if (await exists(themeDir)) {
			const backgrounds = await fs.readdir(themeDir);
			const selected = backgrounds[Math.floor(Math.random() * backgrounds.length)];
			background = `linear-gradient(#00000080, #00000080), url(./assets/images/background/${theme ? 'dark' : 'light'}/${selected})`;
		}
	}

	body.style.backgroundImage = background ? background : theme ? '#000' : '#fff';
	body.style.backgroundSize = 'cover';
	body.style.backgroundRepeat = 'no-repeat';
}

/**
 * Helper to check if a path exists asynchronously
 */
async function exists(p) {
	try {
		await fs.access(p);
		return true;
	} catch {
		return false;
	}
}

/* ╔════════════════════════════════════════════════════╗
   ║  🔀  PANEL TRANSITIONS (UI Navigation)             ║
   ╚════════════════════════════════════════════════════╝ */
async function changePanel(id) {
	const panel = document.querySelector(`.${id}`);
	const active = document.querySelector(`.active`);

	if (active && active !== panel) {
		const container = active.querySelector('.container');
		container.style.opacity = 0;
		container.style.transform = 'scale(0.95)';
		await new Promise(resolve => setTimeout(resolve, 400));

		active.classList.remove('active');
		container.style.visibility = 'hidden';
	}

	const container = panel.querySelector('.container');
	panel.classList.add('active');
	container.style.visibility = 'visible';
	container.style.opacity = 1;

	setTimeout(() => container.style.transform = 'scale(1)', 100);
}

/* ╔════════════════════════════════════════════════════╗
   ║  📂  SYSTEM PATHS                                  ║
   ╚════════════════════════════════════════════════════╝ */
async function appdata() {
	return await ipcRenderer.invoke('appData');
}

/* ╔════════════════════════════════════════════════════╗
   ║  👤  ACCOUNT MANAGEMENT                            ║
   ╚════════════════════════════════════════════════════╝ */
const skinInstance = new skin2D();

async function addAccount(data) {
	let existing = document.getElementById(data.ID);
	if (existing) return existing;

	let skin = false;
	if (data?.profile?.skins[0]?.base64) {
		skin = await skinInstance.creatHeadTexture(data.profile.skins[0].base64);
	}

	const div = document.createElement('div');
	div.classList.add('account');
	div.id = data.ID;
	div.innerHTML = `
		<div class="profile-image" ${skin ? `style="background-image: url(${skin});"` : ''}></div>
		<div class="profile-infos">
			<div class="profile-pseudo">${data.name}</div>
			<div class="profile-uuid">${data.uuid}</div>
		</div>
		<div class="delete-profile" id="${data.ID}">
			<div class="icon-account-delete delete-profile-icon"></div>
		</div>
	`;
	return document.querySelector('.accounts-list').appendChild(div);
}

async function accountSelect(data) {
	const account = document.getElementById(data.ID);
	const active = document.querySelector('.account-select');

	if (active) active.classList.toggle('account-select');
	account.classList.add('account-select');

	if (data?.profile?.skins[0]?.base64)
		await headplayer(data.profile.skins[0].base64);
}

/* ╔════════════════════════════════════════════════════╗
   ║  🧑‍🎮  PLAYER HEAD TEXTURE                        ║
   ╚════════════════════════════════════════════════════╝ */
async function headplayer(skinBase64) {
	const skin = await skinInstance.creatHeadTexture(skinBase64);
	document.querySelector('.player-head').style.backgroundImage = `url(${skin})`;
}

/* ╔════════════════════════════════════════════════════╗
   ║  🌐  SERVER STATUS MONITORING                      ║
   ╚════════════════════════════════════════════════════╝ */
async function setStatus(opt) {
	const nameEl = document.querySelector('.server-status-name');
	const textEl = document.querySelector('.server-status-text');
	const playerCountEl = document.querySelector('.status-player-count .player-count');

	console.log('🌍 Initializing server status... (refresh every 15s)');

	async function updateStatus() {
		if (!opt) {
			textEl.innerHTML = `Hors ligne - 0 ms`;
			playerCountEl.innerHTML = '0';
			return;
		}

		const { ip, port, nameServer } = opt;
		nameEl.innerHTML = nameServer;

		const status = new Status(ip, port);
		const server = await status.getStatus().catch(err => err);

		if (!server.error) {
			textEl.classList.remove('red');
			textEl.classList.add('green');
			document.querySelector('.status-player-count').classList.remove('red');
			document.querySelector('.status-player-count').classList.add('green');
			textEl.innerHTML = `En ligne - ${server.ms} ms`;
			playerCountEl.innerHTML = server.playersConnect;
		} else {
			textEl.innerHTML = `Hors ligne - 0 ms`;
			playerCountEl.innerHTML = '0';
		}
	}

	await updateStatus();
	setInterval(updateStatus, 15000);
}

/* ╔════════════════════════════════════════════════════╗
   ║  🧮  UUID GENERATOR (Deterministic - Offline Mode) ║
   ╚════════════════════════════════════════════════════╝ */
function generateDeterministicUUID(username) {
	const crypto = require('crypto');
	const data = Buffer.from('OfflinePlayer:' + username, 'utf8');
	const hash = crypto.createHash('md5').update(data).digest();

	// Apply UUID v3 format bits
	hash[6] = (hash[6] & 0x0f) | 0x30;
	hash[8] = (hash[8] & 0x3f) | 0x80;

	const hex = hash.toString('hex');
	return [
		hex.substring(0, 8),
		hex.substring(8, 12),
		hex.substring(12, 16),
		hex.substring(16, 20),
		hex.substring(20, 32),
	].join('-');
}

/* ╔════════════════════════════════════════════════════╗
   ║  📦  EXPORTS (UTILS REGISTRY)                      ║
   ╚════════════════════════════════════════════════════╝ */
export {
	appdata,
	changePanel,
	config,
	database,
	logger,
	popup,
	setBackground,
	skin2D,
	addAccount,
	accountSelect,
	slider as Slider,
	pkg,
	setStatus,
	generateDeterministicUUID,
};