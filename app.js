// Modules to control application life and create native browser window
const {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  remote,
} = require('electron');
const fs = require('fs');
const { spawn } = require('cross-spawn');
const settings = require('electron-settings');
const homedir = require('os').homedir();
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let promptWindow;
let addonJSON;
var dtObj = new Date();
var hours = dtObj.getHours();
var minutes = dtObj.getMinutes();
var finalTime = hours + ":" + minutes;

console.log('\n');

// Create log file if it doesn't exist
fs.stat(homedir + "/AppData/Roaming/gmod-addon-tool/GMATLog.txt", function(err, stats) {
  if (err) {
    if (err != null) { console.log(err); }
    fs.access(homedir + "/AppData/Roaming/gmod-addon-tool/GMATLog.txt", fs.constants.F_OK, (err) => {
      console.log("Created log.txt");
      fs.appendFile(homedir + "/AppData/Roaming/gmod-addon-tool/GMATLog.txt", "--- Beginning of log --- \n", 'utf8', (err) => {
      });
    });
  } else {
    fs.appendFile(homedir + "/AppData/Roaming/gmod-addon-tool/GMATLog.txt", "\n-----------------------", 'utf8', (err) => { if (err != null) { console.log(err) } });
  }
});

// Changes extensions to appropriate endings for Linux or Windows 
let isWin = process.platform === "win32";

if (isWin) {ext = ".ico"; gmpublishFile = "gmpublish.exe"; gmadFile = "gmad.exe"} else {ext = ".png"; gmpublishFile = "gmpublish_linux"; gmadFile = "gmad_linux"};

function createWindow() {
  // 
  app.allowRendererProcessReuse = true;

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 500,
    height: 225,
    resizable: false,
    fullscreenable: false,
    backgroundColor: "#048CEC",
    titleBarStyle: "hidden",
    frame: false,
    icon: __dirname + "/src/img/icon" + ext,
    webPreferences: {
        nodeIntegration: true
    }
  });
      
  // and load the index.html of the app.
  mainWindow.loadFile('index.html');


  // Open the DevTools.
  mainWindow.webContents.openDevTools();

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
      // Dereference the window object, usually you would store windows
      // in an array if your app supports multi windows, this is the time
      // when you should delete the corresponding element.
      mainWindow = null
  });
  
  // When an anchor tab w/ a target attribute with a value of "_blank", this will stop the default behavior and open the link in the user's default browser. 
  mainWindow.webContents.on('new-window', function(e, url) {
    e.preventDefault();
    require('electron').shell.openExternal(url);
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function() {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

// Settings Modal
function openSettings(callback) {
  promptWindow = new BrowserWindow({
    width: 200, 
    height: 150,
    parent: mainWindow,
    show: false,
    modal: true,
    title : "Settings",
    autoHideMenuBar: true,
    resizable: false,
    fullscreenable: false,
    backgroundColor: "#262626",
    titleBarStyle: "hidden",
    frame: false,
    webPreferences: { 
      nodeIntegration: true,
    }
  });

  promptWindow.on('closed', () => { 
    promptWindow = null 
  });

  // Load the HTML dialog box
  promptWindow.loadFile("settings.html");
  promptWindow.once('ready-to-show', () => { promptWindow.show();});
}



// Checks to see if the directory the user chooses is writeable 
ipcMain.on('checkIfDirectoryExists', (event, file, jsonCheck) => {
  fs.access(file, fs.constants.R_OK, (err) => {
    console.log(`${file} ${err ? 'is not readable' : 'is readable'}`);
  });
  if (jsonCheck) { checkIfAddonJSONExist(file) }
});

function checkIfAddonJSONExist (file) {
  fs.stat(file + "/addon.json", function(err, stats) {
    if (err) {
      mainWindow.webContents.send('addonJSONCheck', false);
    } else {
      fs.readFile(file + '/addon.json', function read(err, data) {
        if (err) {
            throw err;
        }
        const content = data.toString("utf-8");
        mainWindow.webContents.send('addonJSONCheck', true, content);
      });
    }
  });
}

// This will send the client the IDs of their addons
ipcMain.on('getAddonInfo', () => {
  console.log('Trying to get addon info...');
  sendClientAddonInfo();
  console.log("User's Gmod Directory:" + settings.get('gmodDirectory'));
});

var ADDON_IDS = [];

// We use this to get the addon IDs from gmpublish.exe
function sendClientAddonInfo() {
  const bat = spawn(settings.get('gmodDirectory') + '/bin/' + gmpublishFile, ['list']);
  bat.stdout.on('data', (data) => {
    console.log(data.toString());
    sendConsoleData(data.toString().split('\n'));
    var arrayOfOutput = data.toString().split('\n');
    var fixedArray = arrayOfOutput.slice(5, arrayOfOutput.length - 3);
    for (var i = 0; i < fixedArray.length; i++) {
        fixedArray[i] = fixedArray[i].replace('/r', '');
        ADDON_IDS.push([fixedArray[i].substr(0, 11).replace(/\s/g, '').toString()])
    }
    if (fixedArray == "Couldn't initialize Steam!\r") {
      mainWindow.webContents.send('errorNote', "Steam doesn't seem open!\nOpen Steam.", true, false);
    }
    console.log("Addon IDs", ADDON_IDS);
    mainWindow.webContents.send('addonInfo', ADDON_IDS);
  });
}

// This creates our addon.json
ipcMain.on('createJsonFile', (event, json, dir) => {
  fs.writeFileSync(dir + "/addon.json", JSON.stringify(json), 'utf8', (err) => {
    if (err != null) {
      mainWindow.webContents.send('errorNote', "An error occured while writing JSON object to File.\n", false, true);
    }
  });
});

// This is ran once the client requests to create an addon
ipcMain.on('createGMAFile', (event, addonDir) => {
  console.log("Addon's Directory: " + addonDir.toString());
  sendConsoleData(["Addon's directory: " + addonDir.toString()]);
  const gmad = spawn(settings.get('gmodDirectory') + '/bin/' + gmadFile, ['create', '-folder', addonDir]);
  gmad.stdout.on('data', (data) => {
    var arrayOfOutput = data.toString().split('\n');
    if (data.includes('File list verification failed')) {
      mainWindow.webContents.send("errorNote", "File list verification failed - check your addon for unallowed files.", false, true);
    }
    if (data.includes("Successfully")) { 
      var fixedArray = arrayOfOutput.slice(arrayOfOutput.length - 2, arrayOfOutput.length - 1);
      fixedArray = fixedArray[0].match(/(?:"[^"]*"|^[^"]*$)/)[0].replace(/"/g, "");
      var addonGMADir = fixedArray;
      mainWindow.webContents.send('addonGMALocation', addonGMADir); 
      console.log("GMA location: " + addonGMADir);
      sendConsoleData(arrayOfOutput);
    }
  });
});

// This block will upload the GMA file to the Steam Workshop
ipcMain.on('uploadToWorkshop', (event, gmaDir, iconDir, addonId) => {
  if (addonId != null) {
    const gmpublish = spawn(settings.get('gmodDirectory') + '/bin/' + gmpublishFile, ['update', '-id', addonId, '-icon', iconDir, '-addon', gmaDir]);
    gmpublish.stdout.on('data', (data) => {
      var arrayOfOutput = data.toString().split('\n');
      sendConsoleData(arrayOfOutput);
      if (data.includes('512x512')) {
        mainWindow.webContents.send("errorNote", "Image must be a 512x512 baseline jpeg! Trying exporting with Paint.", false, false);
      }
      var fixedArray = arrayOfOutput.slice(arrayOfOutput.length - 2, arrayOfOutput.length - 1);
      fixedArray = fixedArray[0].replace(/\D/, '');
      fixedArray = fixedArray.substr(5, fixedArray.length);
      mainWindow.webContents.send('currentAddonID', fixedArray);
    });
  } else {
    // Passes all the info needed to publish a Garry's Mod addon
    const gmpublish = spawn(settings.get('gmodDirectory') + '/bin/' + gmpublishFile, ['create', '-icon', iconDir, '-addon', gmaDir]);
    console.log(gmpublishFile, gmaDir, iconDir)
    gmpublish.stdout.on('data', (data) => {
      var arrayOfOutput = data.toString().split('\n');
      sendConsoleData(arrayOfOutput);
      // If gmpublish output contains "512x512" in data stream, user did not provide a correctly sized image
      if (data.includes('512x512')) {
        mainWindow.webContents.send("errorNote", "Image must be a 512x512 baseline jpeg! Trying exporting with Paint.", false, false);
      }
      
      if (data.includes("Addon creation finished")) {
        var fixedArray = arrayOfOutput.slice(arrayOfOutput.length - 2, arrayOfOutput.length - 1);
        fixedArray = fixedArray[0].replace(/\D/, '');
        fixedArray = fixedArray.substr(5, fixedArray.length);
        var stringArray = fixedArray.toString();
        var addonURLIndex = stringArray.indexOf("?id=");
        var addonURL = stringArray.slice(addonURLIndex + 4, addonURLIndex + 14)
        mainWindow.webContents.send('currentAddonID', addonURL);
      }
    });
  };
});

// This will extract a GMA file into the same directory
ipcMain.on("extractAddon", (e, path) => {
  const gmad = spawn(settings.get('gmodDirectory') + '/bin/' + gmadFile, ['extract', '-file', path]);
  mainWindow.webContents.send("finishExtraction");
});

// Writes info to GMATLog.txt
function sendConsoleData(dataArray) {
  dataArray.forEach(data => {
    fs.appendFile(homedir + "/AppData/Roaming/gmod-addon-tool/GMATLog.txt", "\n[" + finalTime + "]" + data, 'utf8', (err) => {});
  });
}

// Settings Modal

// Creating the dialog

function openSettings(callback) {
  promptWindow = new BrowserWindow({
    width: 200, 
    height: 150,
    parent: mainWindow,
    show: false,
    modal: true,
    title : "Settings",
    autoHideMenuBar: true,
    resizable: false,
    fullscreenable: false,
    backgroundColor: "#262626",
    titleBarStyle: "hidden",
    frame: false,
    webPreferences: { 
      nodeIntegration: true,
    }
  });

  promptWindow.on('closed', () => { 
    promptWindow = null 
  });

  promptWindow.webContents.on('new-window', function(e, url) {
    e.preventDefault();
    require('electron').shell.openExternal(url);
  });

  // Load the HTML dialog box
  promptWindow.loadFile("settings.html")
  promptWindow.once('ready-to-show', () => { promptWindow.show();});
}

ipcMain.on("openSettings", (e) => {
  console.log(__dirname);
  openSettings();
});


ipcMain.on("openConsole", (e) => {
  openConsole();
});

ipcMain.on("logError", (e, error) => {
  sendConsoleData(error);
});
