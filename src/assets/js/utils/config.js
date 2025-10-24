const pkg = require('../package.json');
const convert = require('xml-js');

const BASE_URL = pkg.user ? `${pkg.url}/${pkg.user}` : pkg.url;

const CONFIG_URL = `${BASE_URL}/launcher/config-launcher/config.json`;
const NEWS_URL = `${BASE_URL}/launcher/news-launcher/news.json`;

const FETCH_TIMEOUT = 8000;

class Config {
	async GetConfig() {
		try {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

			const res = await fetch(CONFIG_URL, { signal: controller.signal });
			clearTimeout(timeout);

			if (!res.ok) throw new Error(`Serveur inaccessible (${res.status})`);

			return await res.json();
		} catch (err) {
			console.error('❌ GetConfig error:', err);
			return { error: { message: err.message || String(err) } };
		}
	}

	async getInstanceList() {
		try {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

			const res = await fetch(`${BASE_URL}/files`, {
				signal: controller.signal,
			});
			clearTimeout(timeout);

			if (!res.ok) throw new Error(`HTTP ${res.status}`);

			const json = await res.json();
			return Object.entries(json).map(([name, data]) => ({ name, ...data }));
		} catch (err) {
			console.error('❌ getInstanceList error:', err);
			return [];
		}
	}

	async getNews() {
		try {
			const cfg = await this.GetConfig();
			if (cfg?.rss) return this._fetchRSSFeed(cfg.rss);

			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

			const res = await fetch(NEWS_URL, { signal: controller.signal });
			clearTimeout(timeout);

			if (!res.ok) throw new Error(`Serveur news inaccessible (${res.status})`);

			return await res.json();
		} catch (err) {
			console.error('❌ getNews error:', err);
			return [];
		}
	}

	async _fetchRSSFeed(rssUrl) {
		try {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

			const res = await fetch(rssUrl, { signal: controller.signal });
			clearTimeout(timeout);

			if (!res.ok) throw new Error(`Flux RSS inaccessible (${res.status})`);

			const xmlText = await res.text();
			const parsed = JSON.parse(convert.xml2json(xmlText, { compact: true }))
				?.rss?.channel?.item;

			if (!parsed) return [];

			const items = Array.isArray(parsed) ? parsed : [parsed];

			return items.map((item) => ({
				title: item?.title?._text || 'Sans titre',
				content: item?.['content:encoded']?._text || '',
				author: item?.['dc:creator']?._text || 'Inconnu',
				publish_date: item?.pubDate?._text || 'Date inconnue',
			}));
		} catch (err) {
			console.error('❌ _fetchRSSFeed error:', err);
			return [];
		}
	}
}

export default new Config();
