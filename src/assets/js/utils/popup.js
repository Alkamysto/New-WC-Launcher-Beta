const { ipcRenderer } = require('electron');

class Popup {
	constructor() {
		this.popup = document.querySelector('.popup');
		this.popupTitle = document.querySelector('.popup-title');
		this.popupContent = document.querySelector('.popup-content');
		this.popupOptions = document.querySelector('.popup-options');
		this.popupButton = document.querySelector('.popup-button');

		if (
			!this.popup ||
			!this.popupTitle ||
			!this.popupContent ||
			!this.popupButton ||
			!this.popupOptions
		) {
			console.warn('⚠️ Certains éléments DOM du popup sont manquants !');
		}

		this.boundButtonClick = null;
	}

	openPopup(info = {}) {
		if (!this.popup) return;

		const {
			title = '',
			content = '',
			color = '#e21212',
			options = false,
			exit = false,
			background = true,
		} = info;

		this.popup.style.display = 'flex';
		this.popup.style.background = background
			? 'rgba(0,0,0,0.7)'
			: 'transparent';

		this.popupTitle.innerHTML = title;
		this.popupContent.style.color = color;
		this.popupContent.innerHTML = content;

		this.popupOptions.style.display = options ? 'flex' : 'none';

		if (this.boundButtonClick) {
			this.popupButton.removeEventListener('click', this.boundButtonClick);
			this.boundButtonClick = null;
		}

		if (options) {
			this.boundButtonClick = () => {
				if (exit) return ipcRenderer.send('main-window-close');
				this.closePopup();
			};
			this.popupButton.addEventListener('click', this.boundButtonClick, {
				once: true,
			});
		}
	}

	closePopup() {
		if (!this.popup) return;

		this.popup.style.display = 'none';
		this.popupTitle.innerHTML = '';
		this.popupContent.innerHTML = '';
		this.popupOptions.style.display = 'none';

		if (this.boundButtonClick) {
			this.popupButton.removeEventListener('click', this.boundButtonClick);
			this.boundButtonClick = null;
		}
	}
}

export default Popup;
