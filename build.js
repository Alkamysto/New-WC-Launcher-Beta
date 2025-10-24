/**
 * ⚙️  Electron Builder Script - Launcher Builder
 * ---------------------------------------------
 * Author  : Luuxis
 * License : CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 * Purpose : Automates build process, obfuscation, and icon generation for the launcher.
 */

const fs = require("fs").promises;
const path = require("path");
const builder = require("electron-builder");
const JavaScriptObfuscator = require("javascript-obfuscator");
const fetch = require("node-fetch");
const png2icons = require("png2icons");
const Jimp = require("jimp");

const { preductname } = require("./package.json");

/* ╔════════════════════════════════════════════════════╗
   ║  🏗️  LAUNCHER BUILDER CLASS                        ║
   ╚════════════════════════════════════════════════════╝ */
class Index {
    constructor() {
        this.shouldObfuscate = true;
        this.filesList = [];
    }

    /* ╔════════════════════════════════════════════════════╗
       ║  🚀  ENTRY POINT & ARGUMENT PARSING                ║
       ╚════════════════════════════════════════════════════╝ */
    async init() {
        const args = this.parseArgs(process.argv);

        // --icon=<url>
        if (args.icon) await this.setIcon(args.icon);

        // --obf=true/false
        if (args.obf !== undefined) {
            this.shouldObfuscate = args.obf;
            this.filesList = await this.getFiles("src");
        }

        // --build=platform
        if (args.build === "platform") await this.buildPlatform();
    }

    /**
     * 🧩 Parse command line arguments
     * Converts '--key=value' to { key: value }
     */
    parseArgs(argv) {
        return argv.slice(2).reduce((acc, arg) => {
            const [key, value] = arg.replace(/^--/, "").split("=");
            acc[key] = value === "true" ? true : value === "false" ? false : value;
            return acc;
        }, {});
    }

    /* ╔════════════════════════════════════════════════════╗
       ║  🔒  CODE OBFUSCATION & FILE PROCESSING            ║
       ╚════════════════════════════════════════════════════╝ */
    async obfuscate() {
        // Clear previous build folder
        try {
            await fs.rm("./app", { recursive: true, force: true });
        } catch {}

        // Process files in parallel
        const tasks = this.filesList.map(async (filePath) => {
            const relPath = path.relative("src", filePath);
            const destPath = path.join("app", relPath);
            await fs.mkdir(path.dirname(destPath), { recursive: true });

            const ext = path.extname(filePath);

            // JS Files: Obfuscate or Copy
            if (ext === ".js") {
                const code = (await fs.readFile(filePath, "utf8")).replace(/src\//g, "app/");
                if (this.shouldObfuscate) {
                    console.log(`🔒 Obfuscating ${filePath}`);
                    const obfuscated = JavaScriptObfuscator.obfuscate(code, {
                        optionsPreset: "high-obfuscation",
                        disableConsoleOutput: false,
                    });
                    await fs.writeFile(destPath, obfuscated.getObfuscatedCode(), "utf8");
                } else {
                    console.log(`📄 Copying ${filePath}`);
                    await fs.writeFile(destPath, code, "utf8");
                }
            } else {
                // Other assets
                await fs.copyFile(filePath, destPath);
            }
        });

        await Promise.all(tasks);
    }

    /* ╔════════════════════════════════════════════════════╗
       ║  🧱  ELECTRON BUILD CONFIGURATION                  ║
       ╚════════════════════════════════════════════════════╝ */
    async buildPlatform() {
        try {
            await this.obfuscate();

            console.log("⚙️ Building application...");

            await builder.build({
                config: {
                    appId: preductname,
                    productName: preductname,
                    copyright: "Copyright © 2020-2025 Luuxis x WalouCorp",
                    artifactName: "${productName}-${os}-${arch}.${ext}",
                    extraMetadata: { main: "app/app.js" },
                    files: ["app/**/*", "package.json", "LICENSE.md"],
                    directories: { output: "dist" },
                    compression: "normal",
                    asar: true,
                    electronDownload: { cache: "./node_modules/.cache/electron" },
                    nodeGypRebuild: false,
                    npmRebuild: true,
                    publish: [{ provider: "github", releaseType: "release" }],

                    /* 🪟 Windows Configuration */
                    win: { icon: "./app/assets/images/icon.ico", target: [{ target: "nsis", arch: "x64" }] },
                    nsis: {
                        oneClick: true,
                        allowToChangeInstallationDirectory: false,
                        createDesktopShortcut: true,
                        runAfterFinish: true
                    },

                    /* 🍎 macOS Configuration */
                    mac: {
                        icon: "./app/assets/images/icon.icns",
                        category: "public.app-category.games",
                        identity: null,
                        hardenedRuntime: false,
                        gatekeeperAssess: false,
                        mergeASARs: true,
                        singleArchFiles: "node_modules/sqlite3/**/*",
                        target: [
                            { target: "dmg", arch: "universal" },
                            { target: "zip", arch: "universal" }
                        ]
                    },
                    dmg: {
                        sign: false,
                        contents: [
                            { x: 130, y: 220 },
                            { x: 410, y: 220, type: "link", path: "/Applications" }
                        ],
                        artifactName: "${productName}-mac-${arch}.${ext}",
                        format: "ULFO"
                    },

                    /* 🐧 Linux Configuration */
                    linux: { icon: "./app/assets/images/icon.png", target: [{ target: "AppImage", arch: "x64" }] }
                }
            });

            console.log("✅ Build successful!");
        } catch (err) {
            console.error("❌ Build failed:", err);
        }
    }

    /* ╔════════════════════════════════════════════════════╗
       ║  📁  FILE EXPLORATION UTILITY                     ║
       ╚════════════════════════════════════════════════════╝ */
    async getFiles(dir) {
        const files = [];
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            await Promise.all(entries.map(async (entry) => {
                const entryPath = path.join(dir, entry.name);
                if (entry.isDirectory()) files.push(...await this.getFiles(entryPath));
                else files.push(entryPath);
            }));
        } catch {}
        return files;
    }

    /* ╔════════════════════════════════════════════════════╗
       ║  🖼️  ICON GENERATION (ICNS, ICO, PNG)             ║
       ╚════════════════════════════════════════════════════╝ */
    async setIcon(url) {
        try {
            console.log(`🪄 Generating icons from: ${url}`);
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const buffer = await res.buffer();

            const image = await Jimp.read(buffer);
            const resized = await image.resize(256, 256).getBufferAsync(Jimp.MIME_PNG);

            const iconDir = "src/assets/images";
            await fs.mkdir(iconDir, { recursive: true });

            await Promise.all([
                fs.writeFile(`${iconDir}/icon.icns`, png2icons.createICNS(resized, png2icons.BILINEAR, 0)),
                fs.writeFile(`${iconDir}/icon.ico`, png2icons.createICO(resized, png2icons.HERMITE, 0, false)),
                fs.writeFile(`${iconDir}/icon.png`, resized)
            ]);

            console.log("🖼️ New icon set successfully!");
        } catch (err) {
            console.error("⚠️ Failed to set icon:", err.message);
        }
    }
}

/* ╔════════════════════════════════════════════════════╗
   ║  🏁  START BUILD PROCESS                            ║
   ╚════════════════════════════════════════════════════╝ */
new Index().init();