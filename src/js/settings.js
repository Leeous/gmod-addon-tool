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

    document.querySelector("#settings footer p a").addEventListener("click", (e) => {
        e.preventDefault();
        shell.openExternal("https://leeous.com");
    });
    document.getElementById("closeApp").addEventListener("click", () => {
        window.close();
    });
});
