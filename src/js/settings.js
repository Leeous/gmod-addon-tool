const shell = require("electron").shell;
const settings = require("electron-settings");

$(document).ready(() => {
    // Button functionality 
    $("#resetSettings").click(() => {
        $("#resetSettings").text("Settings erased!");
        $("#resetSettings").css({
            backgroundColor: "#ff4343",
            color: "white"
        });
        settings.deleteAll();
    });
    
    $("#openConsole").click(() => {
        shell.openItem(__dirname + "/log.txt");
    });

    $("#closeApp").click(() => {
        window.close();
    });
});
