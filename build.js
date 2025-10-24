const fs = require("fs");
const path = require("path");
const builder = require("electron-builder");
const JavaScriptObfuscator = require("javascript-obfuscator");
const nodeFetch = require("node-fetch");
const png2icons = require("png2icons");
const Jimp = require("jimp");

const { preductname } = require("./package.json");

class LauncherBuilder {
    constructor() {
        this.obf = true;
        this.Fileslist = [];
    }

    async init() {
        try {
            for (const arg of process.argv) {
                if (arg.startsWith("--icon=")) {
                    console.log("🖌️ Nouvelle icône détectée !");
                    await this.iconSet(arg.split("=")[1]);
                } else if (arg.startsWith("--obf=")) {
                    this.obf = JSON.parse(arg.split("=")[1]);
                    console.log(`🔧 Obfuscation: ${this.obf ? "ON" : "OFF"}`);
                    this.Fileslist = this.getFiles("src");
                } else if (arg.startsWith("--build=")) {
                    const buildType = arg.split("=")[1];
                    if (buildType === "platform") await this.buildPlatform();
                }
            }
        } catch (err) {
            console.error("💥 [INIT ERROR] Quelque chose a explosé :", err);
        }
    }

    async Obfuscate() {
        try {
            if (fs.existsSync("./app")) {
                console.log("🧹 Nettoyage du dossier app...");
                fs.rmSync("./app", { recursive: true, force: true });
            }

            for (const filePath of this.Fileslist) {
                const fileName = path.basename(filePath);
                const ext = path.extname(fileName).slice(1);
                const folder = filePath.replace(`/${fileName}`, "").replace("src", "app");

                if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

                if (ext === "js") {
                    let code = fs.readFileSync(filePath, "utf8");
                    code = code.replace(/src\//g, "app/");

                    if (this.obf) {
                        console.log(`🛠️ Obfuscating ${filePath}...`);
                        const obf = JavaScriptObfuscator.obfuscate(code, {
                            compact: true,
                            controlFlowFlattening: true,
                            deadCodeInjection: true,
                            debugProtection: true,
                            disableConsoleOutput: false,
                            rotateStringArray: true,
                        });
                        fs.writeFileSync(`${folder}/${fileName}`, obf.getObfuscatedCode(), "utf8");
                    } else {
                        console.log(`📄 Copie simple de ${filePath}`);
                        fs.writeFileSync(`${folder}/${fileName}`, code, "utf8");
                    }
                } else {
                    fs.copyFileSync(filePath, `${folder}/${fileName}`);
                    console.log(`🎨 Copie d’asset: ${filePath}`);
                }
            }

            console.log("✅ Tous les fichiers sont prêts pour le build !");
        } catch (err) {
            console.error("💥 [OBFUSCATE ERROR] Problème lors du traitement des fichiers :", err);
        }
    }

    async buildPlatform() {
        await this.Obfuscate();

        try {
            console.log("🚧 Démarrage du build multi-plateforme...");
            await builder.build({
                config: {
                    generateUpdatesFilesForAllChannels: false,
                    appId: preductname,
                    productName: preductname,
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
                    win: {
                        icon: "./app/assets/images/icon.ico",
                        target: [{ target: "nsis", arch: "x64" }],
                    },
                    nsis: {
                        oneClick: true,
                        allowToChangeInstallationDirectory: false,
                        createDesktopShortcut: true,
                        runAfterFinish: true,
                    },
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
                            { target: "zip", arch: "universal" },
                        ],
                    },
                    dmg: {
                        sign: false,
                        contents: [
                            { x: 130, y: 220 },
                            { x: 410, y: 220, type: "link", path: "/Applications" },
                        ],
                        artifactName: "${productName}-mac-${arch}.${ext}",
                        format: "ULFO",
                    },
                    linux: {
                        icon: "./app/assets/images/icon.png",
                        target: [{ target: "AppImage", arch: "x64" }],
                    },
                },
            });

            console.log("🎉 Build terminé avec succès !");
        } catch (err) {
            console.error("💥 Build échoué !", err);
        }
    }

    getFiles(dirPath, fileList = []) {
        if (!fs.existsSync(dirPath)) return fileList;

        const entries = fs.readdirSync(dirPath);
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry);
            if (fs.statSync(fullPath).isDirectory()) {
                this.getFiles(fullPath, fileList);
            } else {
                fileList.push(fullPath);
            }
        }

        return fileList;
    }

    async iconSet(url) {
        try {
            console.log(`🌐 Téléchargement de l'icône depuis: ${url}`);
            const res = await nodeFetch(url);
            if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

            let buffer = await res.buffer();
            const image = await Jimp.read(buffer);
            buffer = await image.resize(256, 256).getBufferAsync(Jimp.MIME_PNG);

            fs.writeFileSync("src/assets/images/icon.icns", png2icons.createICNS(buffer, png2icons.BILINEAR, 0));
            fs.writeFileSync("src/assets/images/icon.ico", png2icons.createICO(buffer, png2icons.HERMITE, 0, false));
            fs.writeFileSync("src/assets/images/icon.png", buffer);

            console.log("✨ Nouvelle icône appliquée avec succès !");
        } catch (err) {
            console.error("💥 [ICON ERROR] Impossible de récupérer ou traiter l'icône :", err);
        }
    }
}

new LauncherBuilder().init();