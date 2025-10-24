class Slider {
	constructor(selector, minValue, maxValue) {
		this.slider = document.querySelector(selector);
		if (!this.slider) throw new Error(`Slider "${selector}" introuvable ❌`);

		this.touchLeft = this.slider.querySelector('.slider-touch-left');
		this.touchRight = this.slider.querySelector('.slider-touch-right');
		this.lineSpan = this.slider.querySelector('.slider-line span');

		if (!this.touchLeft || !this.touchRight || !this.lineSpan) {
			throw new Error(
				`Slider DOM incomplet : vérifie les classes 'slider-touch-left', 'slider-touch-right' et 'slider-line'`
			);
		}

		this.min = parseFloat(this.slider.getAttribute('min')) || 0;
		this.max = parseFloat(this.slider.getAttribute('max')) || 100;
		this.step = parseFloat(this.slider.getAttribute('step')) || 1;

		this.minValue = minValue ?? this.min;
		this.maxValue = maxValue ?? this.max;

		this.startX = 0;
		this.selectedTouch = null;

		this.normalizeFact = 18;

		this.updateBounds();
		this.setMinValue(this.minValue);
		this.setMaxValue(this.maxValue);

		['mousedown', 'touchstart'].forEach((evt) => {
			this.touchLeft.addEventListener(evt, (e) =>
				this.onStart(this.touchLeft, e)
			);
			this.touchRight.addEventListener(evt, (e) =>
				this.onStart(this.touchRight, e)
			);
		});

		this.callbacks = {};
	}

	updateBounds() {
		this.sliderWidth = this.slider.offsetWidth;
		this.maxX = this.sliderWidth - this.touchRight.offsetWidth;
		this.initialLineWidth = this.sliderWidth - this.touchLeft.offsetWidth;
	}

	setMinValue(val) {
		val = this.clamp(val);
		const ratio = (val - this.min) / (this.max - this.min);
		this.touchLeft.style.left = `${Math.round(ratio * (this.sliderWidth - this.touchLeft.offsetWidth - this.normalizeFact))}px`;
		this.updateLine();
	}

	setMaxValue(val) {
		val = this.clamp(val);
		const ratio = (val - this.min) / (this.max - this.min);
		this.touchRight.style.left = `${Math.round(ratio * (this.sliderWidth - this.touchLeft.offsetWidth - this.normalizeFact) + this.normalizeFact)}px`;
		this.updateLine();
	}

	updateLine() {
		this.lineSpan.style.marginLeft = `${this.touchLeft.offsetLeft}px`;
		this.lineSpan.style.width = `${this.touchRight.offsetLeft - this.touchLeft.offsetLeft}px`;
	}

	onStart(elem, event) {
		event.preventDefault();
		this.selectedTouch = elem;
		const pageX = event.pageX ?? event.touches?.[0]?.pageX;
		if (pageX === undefined) return;

		this.startX = pageX - elem.offsetLeft;

		this.funcMove = (e) => this.onMove(e);
		this.funcStop = (e) => this.onStop(e);

		document.addEventListener('mousemove', this.funcMove, { passive: false });
		document.addEventListener('mouseup', this.funcStop, { passive: false });
		document.addEventListener('touchmove', this.funcMove, { passive: false });
		document.addEventListener('touchend', this.funcStop, { passive: false });
	}

	onMove(event) {
		event.preventDefault();
		const pageX = event.pageX ?? event.touches?.[0]?.pageX;
		if (pageX === undefined || !this.selectedTouch) return;

		let x = pageX - this.startX;

		if (this.selectedTouch === this.touchLeft) {
			x = Math.max(
				0,
				Math.min(
					x,
					this.touchRight.offsetLeft - this.selectedTouch.offsetWidth - 24
				)
			);
		} else {
			x = Math.min(
				this.maxX,
				Math.max(x, this.touchLeft.offsetLeft + this.touchLeft.offsetWidth + 24)
			);
		}

		this.selectedTouch.style.left = `${x}px`;
		this.updateLine();
		this.calculateValue();
	}

	onStop() {
		document.removeEventListener('mousemove', this.funcMove);
		document.removeEventListener('mouseup', this.funcStop);
		document.removeEventListener('touchmove', this.funcMove);
		document.removeEventListener('touchend', this.funcStop);

		this.selectedTouch = null;
		this.calculateValue();
	}

	calculateValue() {
		const ratioWidth =
			(this.lineSpan.offsetWidth - this.normalizeFact) / this.initialLineWidth;
		let minVal =
			(this.lineSpan.offsetLeft / this.initialLineWidth) *
				(this.max - this.min) +
			this.min;
		let maxVal = minVal + ratioWidth * (this.max - this.min);

		if (this.step > 0) {
			minVal = Math.round(minVal / this.step) * this.step;
			maxVal = Math.round(maxVal / this.step) * this.step;
		}

		this.minValue = this.clamp(minVal);
		this.maxValue = this.clamp(maxVal);

		this.emit('change', this.minValue, this.maxValue);
	}

	on(eventName, func) {
		if (typeof func === 'function') this.callbacks[eventName] = func;
	}

	emit(eventName, ...args) {
		if (typeof this.callbacks[eventName] === 'function')
			this.callbacks[eventName](...args);
	}

	clamp(val) {
		return Math.min(this.max, Math.max(this.min, val));
	}
}

export default Slider;
