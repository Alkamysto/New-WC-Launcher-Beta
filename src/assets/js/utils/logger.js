/**
 * 📝 Launcher Logger
 * ----------------------------------------------------------
 * Author  : Luuxis
 * License : CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 * Purpose : High-performance colored logger for console output
 *           in the launcher with optional context and grouping.
 * ----------------------------------------------------------
 */

'use strict';

/* ╔════════════════════════════════════════════════════╗
   ║ 🔧 STORE ORIGINAL CONSOLE METHODS                   ║
   ╚════════════════════════════════════════════════════╝ */
const _log = console.log.bind(console);
const _info = console.info.bind(console);
const _warn = console.warn.bind(console);
const _debug = console.debug.bind(console);
const _error = console.error.bind(console);

/* ╔════════════════════════════════════════════════════╗
   ║ 🖋️ LOGGER CLASS                                     ║
   ╚════════════════════════════════════════════════════╝ */
class Logger {
    /**
     * 🛠️ Constructor
     * @param {string} name  - Name prefix for all log messages
     * @param {string} color - Color for the console prefix
     */
    constructor(name = 'Launcher', color = '#7289da') {
        this.name = name;
        this.color = color;

        this.overrideConsole();
    }

    /* ------------------------------------------------------
       🎨 OVERRIDE CONSOLE METHODS
       Adds color and optional grouping to log messages
    ------------------------------------------------------ */
    overrideConsole() {
        const prefix = `%c[${this.name}]:`;
        const style = `color: ${this.color}; font-weight: bold;`;

        console.log = (...args) => _log(prefix, style, ...args);
        console.info = (...args) => _info(prefix, style, ...args);
        console.warn = (...args) => _warn(prefix, style, ...args);
        console.debug = (...args) => _debug(prefix, style, ...args);
        console.error = (...args) => _error(prefix, style, ...args);
    }

    /* ------------------------------------------------------
       🔹 GROUP LOGS
       Allows grouping multiple logs under a collapsible section
    ------------------------------------------------------ */
    group(label, collapsed = true) {
        if (collapsed) console.groupCollapsed(label);
        else console.group(label);
    }

    endGroup() {
        console.groupEnd();
    }
}

/* ╔════════════════════════════════════════════════════╗
   ║ 🚀 EXPORT LOGGER                                     ║
   ╚════════════════════════════════════════════════════╝ */
export default Logger;