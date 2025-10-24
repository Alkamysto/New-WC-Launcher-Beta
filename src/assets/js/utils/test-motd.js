const { status } = require('minecraft-server-util');

const SERVER_IP = 'play.nightwatch.fr';
const SERVER_PORT = 25565;
const TIMEOUT = 5000;

async function getServerStatus(ip = SERVER_IP, port = SERVER_PORT) {
	try {
		const res = await status(ip, port, { timeout: TIMEOUT });

		const motd = res.motd?.clean;

		console.log(
			'🌐 MOTD:',
			Array.isArray(motd) ? motd.join(' ') : motd || '<vide>'
		);

		return {
			online: true,
			motd: Array.isArray(motd) ? motd.join(' ') : motd || '',
			players: res.players?.online || 0,
			maxPlayers: res.players?.max || 0,
			ping: res.latency || 0,
		};
	} catch (err) {
		console.error('💥 Erreur status serveur:', err);

		return {
			online: false,
			motd: '<inaccessible>',
			players: 0,
			maxPlayers: 0,
			ping: null,
		};
	}
}

getServerStatus();
