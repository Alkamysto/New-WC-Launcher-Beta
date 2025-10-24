/**
 * 💬 Launcher Popup Manager
 * ----------------------------------------------------------
 * Author  : Luuxis (refactored)
 * License : CC-BY-NC 4.0
 * Purpose : Handles popup modals in the launcher frontend
 * ----------------------------------------------------------
 */

'use strict';

const { ipcRenderer } = require('electron');

export default class popup {
	constructor() {
		/* ╔════════════════════════════════════════════════════╗
		   ║ 🖼️ DOM ELEMENTS                                     ║
		   ╚════════════════════════════════════════════════════╝ */
		this.popup = document.querySelector('.popup');
		this.popupTitle = document.querySelector('.popup-title');
		this.popupContent = document.querySelector('.popup-content');
		this.popupOptions = document.querySelector('.popup-options');
		this.popupButton = document.querySelector('.popup-button');

		/* ╔════════════════════════════════════════════════════╗
		   ║ ⏱️ ANIMATION SETTINGS                               ║
		   ╚════════════════════════════════════════════════════╝ */
		this.duration = 300;
		this._resolve = null;
		this._exitOnClose = false;

		/* ╔════════════════════════════════════════════════════╗
		   ║ 🖱️ CLOSE BUTTON EVENT                                ║
		   ╚════════════════════════════════════════════════════╝ */
		this.popupButton.addEventListener('click', () => this._handleClose());
	}

	/* ╔════════════════════════════════════════════════════╗
	   ║ 🟢 OPEN POPUP                                        ║
	   ║ Displays a modal with given information and options ║
	   ╚════════════════════════════════════════════════════╝ */
	openPopup(info) {
		return new Promise((resolve) => {
			this._resolve = resolve;
			this._exitOnClose = info.exit || false;

			this.popup.style.display = 'flex';
			this.popup.style.background = info.background === false ? 'none' : '#000000b3';
			this.popupTitle.innerHTML = info.title || '';
			this.popupContent.innerHTML = info.content || '';
			this.popupContent.style.color = info.color || '#e21212';
			this.popupOptions.style.display = info.options ? 'flex' : 'none';

			// Animation fade-in
			this.popup.classList.add('fade-in');
			setTimeout(() => this.popup.classList.remove('fade-in'), this.duration);
		});
	}

	/* ╔════════════════════════════════════════════════════╗
	   ║ 🔴 CLOSE POPUP                                      ║
	   ║ Hides the modal with fade-out and clears content   ║
	   ╚════════════════════════════════════════════════════╝ */
	closePopup() {
		if (!this.popup || this.popup.style.display === 'none') return;

		// Animate fade-out
		this.popup.classList.add('fade-out');
		setTimeout(() => {
			this.popup.style.display = 'none';
			this.popup.classList.remove('fade-out');

			// Clear content
			this.popupTitle.innerHTML = '';
			this.popupContent.innerHTML = '';
			this.popupOptions.style.display = 'none';

			// Resolve promise if exists
			if (this._resolve) {
				this._resolve();
				this._resolve = null;
			}
		}, this.duration);
	}

	/* ╔════════════════════════════════════════════════════╗
	   ║ 🖱️ INTERNAL HANDLER FOR BUTTON CLICK                ║
	   ║ Closes launcher or popup depending on configuration║
	   ╚════════════════════════════════════════════════════╝ */
	_handleClose() {
		if (this._exitOnClose) ipcRenderer.send('main-window-close');
		this.closePopup();
	}
}