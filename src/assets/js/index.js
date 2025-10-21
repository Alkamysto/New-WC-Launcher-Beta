/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */

 const { ipcRenderer, shell } = require('electron');
 const pkg = require('../package.json');
 const os = require('os');
 import { config, database } from './utils.js';
 const nodeFetch = require("node-fetch");
 
 
 /**
  * ADMIN BYPASS : Suite de touches (Konami + b a)
  * - Active un flag en sessionStorage 'adminOverride' = '1'
  * - La maintenanceCheck() vérifie ce flag et contourne la maintenance si présent
  * - Pour révoquer : sessionStorage.removeItem('adminOverride')
  */
 const ADMIN_SEQUENCE = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
 let _adminKeyBuffer = [];
 function pushAdminKey(key) {
     _adminKeyBuffer.push(key);
     if (_adminKeyBuffer.length > ADMIN_SEQUENCE.length) _adminKeyBuffer.shift();
     if (_adminKeyBuffer.join(',') === ADMIN_SEQUENCE.join(',')) {
         sessionStorage.setItem('adminOverride', '1');
         // Feedback visuel si l'élément message existe
         const msgEl = document.querySelector('.message');
         if (msgEl) {
             msgEl.innerHTML = 'Mode admin activé — contournement maintenance activé';
             // remettre l'affichage d'origine après 3s si souhaité
             setTimeout(() => {
                 // Essayer de retrouver le texte de statut via l'instance Splash si disponible
                 // S'il n'y a pas de message par défaut, on laisse le texte
             }, 3000);
         }
         console.info('Admin override activated (sessionStorage.adminOverride = 1)');
         // on vide le buffer pour éviter réactivation multiple non voulue
         _adminKeyBuffer = [];
     }
 }
 
 // Optionnel : combinaison alternative rapide (Ctrl+Alt+M) pour activer le bypass
 function checkQuickCombo(e) {
     if (e.ctrlKey && e.altKey && e.key && e.key.toLowerCase() === 'm') {
         sessionStorage.setItem('adminOverride', '1');
         const msgEl = document.querySelector('.message');
         if (msgEl) msgEl.innerHTML = 'Mode admin activé (combo rapide)';
         console.info('Admin override activated via quick combo');
     }
 }
 
 // Listener global pour la suite de touches
 document.addEventListener('keydown', (e) => {
     // préserve l'ancien raccourci devtools
     if ((e.ctrlKey && e.shiftKey && e.code === 'KeyI') || e.code === 'F12' || e.key === 'F12') {
         ipcRenderer.send("update-window-dev-tools");
     }
 
     // pour la détection séquentielle, on prend e.key quand disponible sinon e.code
     const key = e.key || e.code;
     pushAdminKey(key);
 
     // combo alternatif
     checkQuickCombo(e);
 });
 
 
 class Splash {
     constructor() {
         this.splash = document.querySelector(".splash");
         this.splashMessage = document.querySelector(".splash-message");
         this.splashAuthor = document.querySelector(".splash-author");
         this.message = document.querySelector(".message");
         this.progress = document.querySelector(".progress");
         this.version = document.querySelector(".version");
         document.addEventListener('DOMContentLoaded', async () => {
             let databaseLauncher = new database();
             let configClient = await databaseLauncher.readData('configClient');
             let theme = configClient?.launcher_config?.theme || "auto"
             let isDarkTheme = await ipcRenderer.invoke('is-dark-theme', theme).then(res => res)
             document.body.className = isDarkTheme ? 'dark global' : 'light global';
             if(process.platform === 'win32') ipcRenderer.send('update-window-progress-load')
             await this.startAnimation()
         });
     }
 
     async startAnimation() {
         let splashes = [
             { "message": "Dommage...", "author": "Walou" },
             { "message": "Pierre Edouard ton goûter", "author": "Walou" },
             { "message": "Quelqu'un à vu espace ?", "author": "Walou" }
         ];
         let splash = splashes[Math.floor(Math.random() * splashes.length)];
         this.splashMessage.textContent = splash.message;
         this.splashAuthor.children[0].textContent = "@" + splash.author;
         await sleep(100);
         document.querySelector("#splash").style.display = "block";
         await sleep(500);
         this.splash.classList.add("opacity");
         await sleep(500);
         this.splash.classList.add("translate");
         this.splashMessage.classList.add("opacity");
         this.splashAuthor.classList.add("opacity");
         this.message.classList.add("opacity");
         this.version.classList.add("opacity");
         await sleep(1000);
         await this.checkUpdate();
     }
 
     async checkUpdate() {
         this.setStatus(`Recherche de mise à jour...`);
 
         ipcRenderer.invoke('update-app').then().catch(err => {
             return this.shutdown(`Erreur lors de la recherche de mise à jour : <br>${err.message}`);
         });
 
         ipcRenderer.on('updateAvailable', () => {
             this.setStatus(`Mise à jour disponible !`);
             if(os.platform() === 'win32') {
                 this.toggleProgress();
                 ipcRenderer.send('start-update');
             }
             else return this.dowloadUpdate();
         })
 
         ipcRenderer.on('error', (event, err) => {
             if(err) return this.shutdown(`${err.message}`);
         })
 
         ipcRenderer.on('download-progress', (event, progress) => {
             ipcRenderer.send('update-window-progress', { progress: progress.transferred, size: progress.total })
             this.setProgress(progress.transferred, progress.total);
         })
 
         ipcRenderer.on('update-not-available', () => {
             console.error("Mise à jour non disponible");
             this.maintenanceCheck();
         })
     }
 
     getLatestReleaseForOS(os, preferredFormat, asset) {
         return asset.filter(asset => {
             const name = asset.name.toLowerCase();
             const isOSMatch = name.includes(os);
             const isFormatMatch = name.endsWith(preferredFormat);
             return isOSMatch && isFormatMatch;
         }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
     }
 
     async dowloadUpdate() {
         const repoURL = pkg.repository.url.replace("git+", "").replace(".git", "").replace("https://github.com/", "").split("/");
         const githubAPI = await nodeFetch('https://api.github.com').then(res => res.json()).catch(err => err);
 
         const githubAPIRepoURL = githubAPI.repository_url.replace("{owner}", repoURL[0]).replace("{repo}", repoURL[1]);
         const githubAPIRepo = await nodeFetch(githubAPIRepoURL).then(res => res.json()).catch(err => err);
 
         const releases_url = await nodeFetch(githubAPIRepo.releases_url.replace("{/id}", '')).then(res => res.json()).catch(err => err);
         const latestRelease = releases_url[0].assets;
         let latest;
 
         if(os.platform() === 'darwin') latest = this.getLatestReleaseForOS('mac', '.dmg', latestRelease);
         else if(os === 'linux') latest = this.getLatestReleaseForOS('linux', '.appimage', latestRelease);
 
 
         this.setStatus(`Mise à jour disponible !<br><div class="download-update">Télécharger</div>`);
         document.querySelector(".download-update").addEventListener("click", () => {
             shell.openExternal(latest.browser_download_url);
             return this.shutdown("Téléchargement en cours...");
         });
     }
 
 
     async maintenanceCheck() {
         // Vérification du flag adminOverride dans sessionStorage
         if (sessionStorage.getItem('adminOverride') === '1') {
             console.warn('Admin override détecté — contournement de la maintenance');
             return this.startLauncher();
         }
 
         config.GetConfig().then(res => {
             if (res.maintenance) return this.shutdown(res.maintenance_message);
             this.startLauncher();
         }).catch(e => {
             console.error(e);
             return this.shutdown("Aucune connexion internet détectée,<br>veuillez réessayer ultérieurement.");
         })
     }
 
     startLauncher() {
         this.setStatus(`Démarrage du launcher`);
         ipcRenderer.send('main-window-open');
         ipcRenderer.send('update-window-close');
     }
 
     shutdown(text) {
         this.setStatus(`${text}<br>Arrêt dans 5s`);
         let i = 4;
         setInterval(() => {
             this.setStatus(`${text}<br>Arrêt dans ${i--}s`);
             if(i < 0) ipcRenderer.send('update-window-close');
         }, 1000);
     }
 
     setStatus(text) {
         this.message.innerHTML = text;
     }
 
     toggleProgress() {
         if(this.progress.classList.toggle("show")) this.setProgress(0, 1);
     }
 
     setProgress(value, max) {
         this.progress.value = value;
         this.progress.max = max;
     }
 }
 
 window.addEventListener('DOMContentLoaded', () => {
     ipcRenderer.on('app-version', (event, version) => {
         document.querySelector('.version').innerText = `Version : ${version}`;
     });
 });
 
 function sleep(ms) {
     return new Promise(r => setTimeout(r, ms));
 }
 
 // L'ancien listener a été remplacé par le listener global plus haut
 // document.addEventListener("keydown", (e) => { ... })
 
 new Splash();
 