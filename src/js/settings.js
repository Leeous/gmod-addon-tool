const shell = require("electron").shell;
const settings = require("electron-settings");
const homedir = require('os').homedir();
const {
    remote,
    ipcRenderer,
    files,
    app
} = require("electron");
const { set } = require("electron-settings");
const { domainToUnicode } = require("url");

$(document).ready(() => {
    if (settings.get("darkMode")) { document.querySelector("link[rel='stylesheet'][href^='src']").setAttribute("href", "src/css/style-dark.css"); }
    // Button functionality 
    document.getElementById("resetSettings").addEventListener("click", () => {
        document.getElementById("resetSettings").innerHTML = "Settings erased!";
        document.getElementById("resetSettings").style.backgroundColor = "#ff4343";
        document.getElementById("resetSettings").style.color = "white";
        // Delete all settings
        settings.deleteAll();
        // Restart app to make changes take effect
        setTimeout(() => {
            document.getElementById("resetSettings").innerHTML = "Restarting...";
            setTimeout(() => {
                remote.app.relaunch(); remote.app.exit(); 
            }, 1000)
        }, 2000)
    });
    
    document.getElementById("currentAppVersion").innerHTML = "Version " + remote.app.getVersion().slice(0, 3);
    
    document.getElementById("openConsole").addEventListener("click", () => {
        shell.openItem(homedir + "/AppData/Roaming/gmod-addon-tool/GMATLog.txt");
    });
  
    document.getElementById("closeApp").addEventListener("click", () => {
        window.close();
    });

    document.getElementById("blueMode").addEventListener("click", () => { if (settings.get("darkMode")) {settings.set("darkMode", false); remote.app.relaunch(); remote.app.exit(0); }});
    document.getElementById("darkMode").addEventListener("click", () => { if (!settings.get("darkMode")) {settings.set("darkMode", true); remote.app.relaunch(); remote.app.exit(0); }});
});