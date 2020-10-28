const shell = require("electron").shell;
const settings = require("electron-settings");
const homedir = require('os').homedir();
const {
    remote,
    ipcRenderer,
    files,
    app
} = require("electron");

$(document).ready(() => {
    // Button functionality 
    document.getElementById("resetSettings").addEventListener("click", () => {
        $("#resetSettings").text("Settings erased!");
        $("#resetSettings").css({
            backgroundColor: "#ff4343",
            color: "white"
        });
        settings.deleteAll();
    });
    
    document.getElementById("openConsole").addEventListener("click", () => {
        shell.openItem(homedir + "/AppData/Roaming/gmod-addon-tool/GMATLog.txt");
    });
  
    document.getElementById("closeApp").addEventListener("click", () => {
        window.close();
    });

    document.getElementById("blueMode").addEventListener("click", () => { settings.set("darkMode", false); remote.app.relaunch(); remote.app.exit(0); });
    document.getElementById("darkMode").addEventListener("click", () => { settings.set("darkMode", true);  remote.app.relaunch(); remote.app.exit(0); });
});