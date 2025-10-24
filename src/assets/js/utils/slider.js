/**
 * 🎚️ Launcher Slider Component
 * ----------------------------------------------------------
 * Author  : Luuxis
 * License : CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0/
 * Purpose : Custom dual-handle slider for launcher settings
 *           (e.g., memory allocation, volume, etc.)
 * ----------------------------------------------------------
 */

'use strict';

export default class Slider {
    /**
     * 🛠️ Constructor
     * @param {string} id - CSS selector of the slider
     * @param {number} minValue - Initial minimum value
     * @param {number} maxValue - Initial maximum value
     */
    constructor(id, minValue, maxValue) {
        this.startX = 0;
        this.x = 0;

        // ╔════════════════════════════════════════════════════╗
        // ║ 🖼 DOM ELEMENTS                                     ║
        // ╚════════════════════════════════════════════════════╝
        this.slider = document.querySelector(id);
        this.touchLeft = this.slider.querySelector('.slider-touch-left');
        this.touchRight = this.slider.querySelector('.slider-touch-right');
        this.lineSpan = this.slider.querySelector('.slider-line span');

        this.min = parseFloat(this.slider.getAttribute('min'));
        this.max = parseFloat(this.slider.getAttribute('max'));
        this.step = parseFloat(this.slider.getAttribute('step')) || 0;
        this.normalizeFact = 18;

        this.minValue = minValue ?? this.min;
        this.maxValue = maxValue ?? this.max;

        this.maxX = this.slider.offsetWidth - this.touchRight.offsetWidth;
        this.selectedTouch = null;
        this.initialValue = this.slider.offsetWidth - this.touchLeft.offsetWidth;

        this.reset();
        this.setMinValue(this.minValue);
        this.setMaxValue(this.maxValue);

        // ╔════════════════════════════════════════════════════╗
        // ║ 🖱️ EVENT LISTENERS                                  ║
        // ╚════════════════════════════════════════════════════╝
        ['mousedown', 'touchstart'].forEach((evt) => {
            this.touchLeft.addEventListener(evt, (e) => this.onStart(this.touchLeft, e));
            this.touchRight.addEventListener(evt, (e) => this.onStart(this.touchRight, e));
        });

        this.func = {}; // 📡 Event registry
    }

    /* ╔════════════════════════════════════════════════════╗
       ║ 🔄 RESET SLIDER POSITIONS                            ║
       ╚════════════════════════════════════════════════════╝ */
    reset() {
        this.touchLeft.style.left = '0px';
        this.touchRight.style.left = this.maxX + 'px';
        this.lineSpan.style.marginLeft = '0px';
        this.lineSpan.style.width = this.maxX + 'px';
        this.startX = 0;
        this.x = 0;
    }

    setMinValue(minValue) {
        const ratio = (minValue - this.min) / (this.max - this.min);
        const leftPos = Math.ceil(ratio * (this.slider.offsetWidth - (this.touchLeft.offsetWidth + this.normalizeFact)));
        this.touchLeft.style.left = leftPos + 'px';
        this.updateLine();
    }

    setMaxValue(maxValue) {
        const ratio = (maxValue - this.min) / (this.max - this.min);
        const rightPos = Math.ceil(ratio * (this.slider.offsetWidth - (this.touchLeft.offsetWidth + this.normalizeFact)) + this.normalizeFact);
        this.touchRight.style.left = rightPos + 'px';
        this.updateLine();
    }

    updateLine() {
        this.lineSpan.style.marginLeft = this.touchLeft.offsetLeft + 'px';
        this.lineSpan.style.width = this.touchRight.offsetLeft - this.touchLeft.offsetLeft + 'px';
    }

    /* ╔════════════════════════════════════════════════════╗
       ║ 🖱️ HANDLE SLIDER DRAG EVENTS                          ║
       ╚════════════════════════════════════════════════════╝ */
    onStart(elem, event) {
        event.preventDefault();
        this.x = elem.offsetLeft;
        this.startX = event.pageX - this.x;
        this.selectedTouch = elem;

        this.funcMove = (e) => this.onMove(e);
        this.funcStop = (e) => this.onStop(e);

        ['mousemove', 'touchmove'].forEach((evt) => document.addEventListener(evt, this.funcMove));
        ['mouseup', 'touchend'].forEach((evt) => document.addEventListener(evt, this.funcStop));
    }

    onMove(event) {
        this.x = event.pageX - this.startX;

        if (this.selectedTouch === this.touchLeft) {
            const maxLeft = this.touchRight.offsetLeft - this.selectedTouch.offsetWidth - 24;
            this.x = Math.min(Math.max(this.x, 0), maxLeft);
        } else {
            const minRight = this.touchLeft.offsetLeft + this.touchLeft.offsetWidth + 24;
            this.x = Math.min(Math.max(this.x, minRight), this.maxX);
        }

        this.selectedTouch.style.left = this.x + 'px';
        this.updateLine();
        this.calculateValue();
    }

    onStop() {
        ['mousemove', 'touchmove'].forEach((evt) => document.removeEventListener(evt, this.funcMove));
        ['mouseup', 'touchend'].forEach((evt) => document.removeEventListener(evt, this.funcStop));
        this.selectedTouch = null;
        this.calculateValue();
    }

    /* ╔════════════════════════════════════════════════════╗
       ║ 📊 CALCULATE CURRENT VALUES                            ║
       ╚════════════════════════════════════════════════════╝ */
    calculateValue() {
        const ratioMin = this.lineSpan.offsetLeft / this.initialValue;
        const ratioMax = (this.lineSpan.offsetWidth - this.normalizeFact) / this.initialValue + ratioMin;

        let minValue = ratioMin * (this.max - this.min) + this.min;
        let maxValue = ratioMax * (this.max - this.min) + this.min;

        if (this.step) {
            minValue = Math.floor(minValue / this.step) * this.step;
            maxValue = Math.floor(maxValue / this.step) * this.step;
        }

        this.minValue = minValue;
        this.maxValue = maxValue;

        this.emit('change', this.minValue, this.maxValue);
    }

    /* ╔════════════════════════════════════════════════════╗
       ║ 📡 EVENTS HANDLER                                    ║
       ╚════════════════════════════════════════════════════╝ */
    on(name, func) {
        this.func[name] = func;
    }

    emit(name, ...args) {
        if (this.func[name]) this.func[name](...args);
    }
}