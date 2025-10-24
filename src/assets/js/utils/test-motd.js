/**
 * 🌐 Launcher MOTD Manager
 * ----------------------------------------------------------
 * Author  : Luuxis
 * License : CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 * Purpose : Fetches and logs the MOTD (Message of the Day)
 *           from a Minecraft server for the launcher.
 * ----------------------------------------------------------
 */

'use strict';

const { status } = require('minecraft-server-util');

// ╔════════════════════════════════════════════════════╗
// ║ 🎯 SERVER CONFIGURATION                               ║
// ╚════════════════════════════════════════════════════╝
const SERVER_HOST = 'play.nightwatch.fr';
const SERVER_PORT = 25565;
const TIMEOUT = 5000;

// ╔════════════════════════════════════════════════════╗
// ║ ⚙️  ASYNC WRAPPER & STABILITY IMPROVEMENTS            ║
// ╚════════════════════════════════════════════════════╝
(async () => {
	try {
		// 📡 Tentative de récupération du statut serveur avec timeout
		const res = await Promise.race([
			status(SERVER_HOST, SERVER_PORT, { timeout: TIMEOUT }),
			new Promise((_, reject) =>
				setTimeout(() => reject(new Error('Timeout dépassé')), TIMEOUT + 1000)
			),
		]);

		// Récupération et nettoyage du MOTD
		const motd = res?.motd?.clean ?? [];
		const formattedMotd = Array.isArray(motd)
			? motd.join(' ')
			: String(motd || '').trim();

		// Affichage dans la console (avec infos supplémentaires)
		console.log(
			'📝 MOTD:',
			formattedMotd || '<vide>'
		);
		console.log(`🌍 Serveur: ${SERVER_HOST}:${SERVER_PORT}`);
		console.log(`👥 Joueurs: ${res.players?.online ?? 0}/${res.players?.max ?? 0}`);
	} catch (err) {
		// Gestion d'erreur robuste (échec de récupération)
		console.error('❌ Erreur lors de la récupération du MOTD:', err.message);
	}
})();