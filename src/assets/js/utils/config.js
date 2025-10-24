/**
 * ⚙️ Launcher Configuration Manager
 * ----------------------------------------------------------
 * Author  : Luuxis
 * License : CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 * Purpose : Fetches launcher config, instances, and news
 *           with improved stability and performance
 * ----------------------------------------------------------
 */

'use strict';

/* ╔════════════════════════════════════════════════════╗
   ║ 🔧 IMPORTS & INITIALIZATION                          ║
   ╚════════════════════════════════════════════════════╝ */
const pkg = require('../package.json');
const convert = require('xml-js');

const baseURL = pkg.user ? `${pkg.url}/${pkg.user}` : pkg.url;
const configURL = `${baseURL}/launcher/config-launcher/config.json`;
const newsURL = `${baseURL}/launcher/news-launcher/news.json`;

/* ╔════════════════════════════════════════════════════╗
   ║ 🛠️ CONFIG CLASS                                      ║
   ╚════════════════════════════════════════════════════╝ */
class Config {

    /* ------------------------------------------------------
       📄 GET LAUNCHER CONFIG
       Returns JSON config or error if server is unreachable
    ------------------------------------------------------ */
    async GetConfig() {
        try {
            const res = await fetch(configURL);
            if (!res.ok) {
                throw { code: res.statusText, message: 'Server not accessible' };
            }
            return await res.json();
        } catch (error) {
            return { error };
        }
    }

    /* ------------------------------------------------------
       🗂️ GET INSTANCES LIST
       Fetches available instances from server
    ------------------------------------------------------ */
    async getInstanceList() {
        try {
            const res = await fetch(`${baseURL}/files`);
            if (!res.ok) throw new Error('Unable to fetch instances');

            const instances = await res.json();
            return Object.entries(instances).map(([name, data]) => {
                return { ...data, name };
            });
        } catch (error) {
            console.error('[Config] Error fetching instances:', error);
            return [];
        }
    }

    /* ------------------------------------------------------
       📰 GET NEWS
       Fetches RSS news if available, otherwise JSON news
    ------------------------------------------------------ */
    async getNews() {
        const configData = (await this.GetConfig()) || {};

        // If RSS feed defined
        if (configData.rss) {
            try {
                const res = await fetch(configData.rss);
                if (!res.ok) throw new Error('RSS feed not accessible');

                let xmlText = await res.text();
                let rssData = convert.xml2json(xmlText, { compact: true });
                let items = JSON.parse(rssData)?.rss?.channel?.item || [];

                if (!Array.isArray(items)) items = [items];

                return items.map((item) => ({
                    title: item.title?._text || '',
                    content: item['content:encoded']?._text || '',
                    author: item['dc:creator']?._text || '',
                    publish_date: item.pubDate?._text || '',
                }));
            } catch (error) {
                console.error('[Config] Error fetching RSS news:', error);
                return [];
            }
        }

        // Fallback to JSON news
        try {
            const res = await fetch(newsURL);
            if (!res.ok) throw new Error('JSON news not accessible');

            return await res.json();
        } catch (error) {
            console.error('[Config] Error fetching JSON news:', error);
            return [];
        }
    }
}

/* ╔════════════════════════════════════════════════════╗
   ║ 🚀 EXPORT CONFIG INSTANCE                             ║
   ╚════════════════════════════════════════════════════╝ */
export default new Config();