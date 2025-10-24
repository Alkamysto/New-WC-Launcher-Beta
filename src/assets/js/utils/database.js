/**
 * 🗄️ Launcher Database Manager
 * ----------------------------------------------------------
 * Author  : Luuxis
 * License : CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 * Purpose : Handles all CRUD operations using NodeBDD
 *           with improved stability and performance
 * ----------------------------------------------------------
 */

'use strict';

/* ╔════════════════════════════════════════════════════╗
   ║ 🔧 IMPORTS & INITIALIZATION                          ║
   ╚════════════════════════════════════════════════════╝ */
const { NodeBDD, DataType } = require('node-bdd');
const { ipcRenderer } = require('electron');

const nodedatabase = new NodeBDD();
const dev = process.env.NODE_ENV === 'dev';

/* ╔════════════════════════════════════════════════════╗
   ║ 🛠️ DATABASE CLASS                                     ║
   ╚════════════════════════════════════════════════════╝ */
class Database {

    /* ------------------------------------------------------
       🆕 INITIALIZE OR CREATE DATABASE TABLE
       tableName   : name of the table
       tableConfig : columns definition
    ------------------------------------------------------ */
    async createDatabase(tableName, tableConfig) {
        const dbPath = await ipcRenderer.invoke('path-user-data');
        const path = dev ? `${dbPath}/../..` : `${dbPath}/databases`;

        return nodedatabase.intilize({
            databaseName: 'Databases',
            fileType: dev ? 'sqlite' : 'db',
            tableName,
            path,
            tableColumns: tableConfig,
        });
    }

    /* ------------------------------------------------------
       📂 GET DATABASE TABLE
       Auto-creates table if it doesn't exist
    ------------------------------------------------------ */
    async getDatabase(tableName) {
        return this.createDatabase(tableName, {
            json_data: DataType.TEXT.TEXT,
        });
    }

    /* ------------------------------------------------------
       ➕ CREATE DATA
       Inserts data into the table and returns the entry with ID
    ------------------------------------------------------ */
    async createData(tableName, data) {
        const table = await this.getDatabase(tableName);
        const entry = await nodedatabase.createData(table, {
            json_data: JSON.stringify(data),
        });
        const parsedData = JSON.parse(entry.json_data);
        parsedData.ID = entry.id;
        return parsedData;
    }

    /* ------------------------------------------------------
       🔍 READ DATA BY KEY
       Returns a single entry by ID
    ------------------------------------------------------ */
    async readData(tableName, key = 1) {
        const table = await this.getDatabase(tableName);
        const entry = await nodedatabase.getDataById(table, key);

        if (!entry) return undefined;

        const data = JSON.parse(entry.json_data);
        data.ID = entry.id;
        return data;
    }

    /* ------------------------------------------------------
       📖 READ ALL DATA
       Returns all entries in the table
    ------------------------------------------------------ */
    async readAllData(tableName) {
        const table = await this.getDatabase(tableName);
        const allData = await nodedatabase.getAllData(table);

        return allData.map((entry) => {
            const data = JSON.parse(entry.json_data);
            data.ID = entry.id;
            return data;
        });
    }

    /* ------------------------------------------------------
       ✏️ UPDATE DATA
       Updates an entry by key (default: 1)
    ------------------------------------------------------ */
    async updateData(tableName, data, key = 1) {
        const table = await this.getDatabase(tableName);
        await nodedatabase.updateData(table, { json_data: JSON.stringify(data) }, key);
    }

    /* ------------------------------------------------------
       🗑️ DELETE DATA
       Deletes an entry by key (default: 1)
    ------------------------------------------------------ */
    async deleteData(tableName, key = 1) {
        const table = await this.getDatabase(tableName);
        await nodedatabase.deleteData(table, key);
    }
}

/* ╔════════════════════════════════════════════════════╗
   ║ 🚀 EXPORT DATABASE CLASS                             ║
   ╚════════════════════════════════════════════════════╝ */
export default Database;