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
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let promptWindow;
var dtObj = new Date();
var hours = dtObj.getHours();
var minutes = dtObj.getMinutes();
var finalTime = hours + ":" + minutes;

console.log('\n');

// Create log file if it doesn't exist
fs.stat(__dirname + "/log.txt", function(err, stats) {
  if (err) {
    fs.access("log.txt", fs.constants.F_OK, (err) => {
      console.log("Created log.txt");
      fs.appendFile('log.txt', "--- Beginning of log --- \n", 'utf8', (err) => {
        if (err != null) { console.log(err); }
      });
    });
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
    backgroundColor: "#262626",
    titleBarStyle: "hidden",
    frame: false,
    icon: __dirname + "/src/img/icon" + ext,
    webPreferences: {
        nodeIntegration: true
    }
  });
      
  // and load the index.html of the app.
  mainWindow.loadFile('index.html')


  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
      // Dereference the window object, usually you would store windows
      // in an array if your app supports multi windows, this is the time
      // when you should delete the corresponding element.
      mainWindow = null
  })
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

// Checks to see if the directory the user chooses is writeable 
ipcMain.on('checkIfDirectoryExists', (event, file) => {
  fs.access(file, fs.constants.R_OK, (err) => {
    // console.log(`${file} ${err ? 'is not readable' : 'is readable'}`);
  });
})

// This will send the client the IDs of their addons
ipcMain.on('getAddonInfo', () => {
  console.log('Trying to get addon info...');
  sendClientAddonInfo();
  console.log("User's Gmod Directory:" + settings.get('gmodDirectory'));
})

var ADDON_IDS = [];

// We use this to get the addon IDs from gmpublish.exe
function sendClientAddonInfo() {
  const bat = spawn(settings.get('gmodDirectory') + '/bin/' + gmpublishFile, ['list']);
  bat.stdout.on('data', (data) => {
    var arrayOfOutput = data.toString().split('\n')
    sendConsoleData(arrayOfOutput);
    var fixedArray = arrayOfOutput.slice(5, arrayOfOutput.length - 3)
    // console.log(fixedArray)
    for (var i = 0; i < fixedArray.length; i++) {
        fixedArray[i] = fixedArray[i].replace('/r', '');
        // console.log(fixedArray)
        ADDON_IDS.push([fixedArray[i].substr(0, 11).replace(/\s/g, '').toString()])
    }

    if (fixedArray == "Couldn't initialize Steam!\r") {
      mainWindow.webContents.send('errorAlert', ADDON_IDS);
    }
    // console.log(ADDON_IDS);
    mainWindow.webContents.send('addonInfo', ADDON_IDS);
  });
}

// This creates our addon.json
ipcMain.on('createJsonFile', (event, json, dir) => {
  // console.log(json, dir)
  fs.writeFileSync(dir + "/addon.json", json, 'utf8', (err) => {
    console.log("An error occured while writing JSON object to File.\n", err);
    mainWindow.webContents.send('error', "Error writing directory.");
  });
});

// This is ran once the client requests to create an addon
ipcMain.on('createGMAFile', (event, addonDir) => {
  console.log("Addon's Directory: " + addonDir.toString());
  const gmad = spawn(settings.get('gmodDirectory') + '/bin/' + gmadFile, ['create', '-folder', addonDir]);
  gmad.stdout.on('data', (data) => {
    var arrayOfOutput = data.toString().split('\n');
    sendConsoleData(arrayOfOutput)
    var fixedArray = arrayOfOutput.slice(arrayOfOutput.length - 2, arrayOfOutput.length - 1)
    fixedArray = fixedArray[0].match(/(?:"[^"]*"|^[^"]*$)/)[0].replace(/"/g, "")
    var addonGMADir = fixedArray;
    console.log("GMA location: " + addonGMADir);
    mainWindow.webContents.send('addonGMALocation', addonGMADir);
  });
});

// This block will upload the GMA file to the Steam Workshop
ipcMain.on('uploadToWorkshop', (event, gmaDir, iconDir, addonId) => {
  if (addonId != null) {
    const gmpublish = spawn(settings.get('gmodDirectory') + '/bin/' + gmpublishFile, ['update', '-id', addonId, '-icon', iconDir, '-addon', gmaDir]);
    gmpublish.stdout.on('data', (data) => {
      var arrayOfOutput = data.toString().split('\n');
      sendConsoleData(arrayOfOutput)
      // console.log(arrayOfOutput)
      var fixedArray = arrayOfOutput.slice(arrayOfOutput.length - 2, arrayOfOutput.length - 1);
      fixedArray = fixedArray[0].replace(/\D/, '');
      fixedArray = fixedArray.substr(5, fixedArray.length);
      mainWindow.webContents.send('currentAddonID', fixedArray);
    });
  } else {
    // Passes all the info needed to publish a Garry's Mod addon
    const gmpublish = spawn(settings.get('gmodDirectory') + '/bin/' + gmpublishFile, ['create', '-icon', iconDir, '-addon', gmaDir]);
    gmpublish.stdout.on('data', (data) => {
      var arrayOfOutput = data.toString().split('\n');
      // console.log(arrayOfOutput)
      sendConsoleData(arrayOfOutput)
      var fixedArray = arrayOfOutput.slice(arrayOfOutput.length - 2, arrayOfOutput.length - 1);
      fixedArray = fixedArray[0].replace(/\D/, '');
      fixedArray = fixedArray.substr(5, fixedArray.length);
      var stringArray = fixedArray.toString()
      var addonURLIndex = stringArray.indexOf("?id=")
      var addonURL = stringArray.slice(addonURLIndex + 4, addonURLIndex + 14)
      // console.log(addonURL)
      mainWindow.webContents.send('currentAddonID', addonURL);
    });
  };
});

// This will extract a GMA file to GarrysMod/garrysmod/addons/[addon_name]
ipcMain.on("extractAddon", (e, path) => {
  // console.log(e, path);
  const gmad = spawn(settings.get('gmodDirectory') + '/bin/' + gmadFile, ['extract', '-file', path]);
  mainWindow.webContents.send("finishExtraction");
});

function sendConsoleData(dataArray) {
  dataArray.forEach(data => {
    fs.appendFile(__dirname + "/log.txt", "[" + finalTime + "] " + data, 'utf8', (err) => {});
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

  // Load the HTML dialog box
  promptWindow.loadFile("settings.html")
  promptWindow.once('ready-to-show', () => { promptWindow.show() })
}

function openConsole(callback) {
  consoleWindow = new BrowserWindow({
    width: 375, 
    height: 275,
    x: 1250,
    y: 400,
    parent: mainWindow,
    show: false,
    modal: false,
    title : "Console",
    autoHideMenuBar: true,
    resizable: false,
    fullscreenable: false,
    backgroundColor: "black",
    titleBarStyle: "hidden",
    frame: false,
    webPreferences: { 
      nodeIntegration: true,
    }
  });

  consoleWindow.on('closed', () => { 
    consoleWindow = null 
  });

  // Load the HTML dialog box
  consoleWindow.loadFile("console.html")
  consoleWindow.once('ready-to-show', () => { consoleWindow.show() })
}

ipcMain.on("openSettings", (e) => {
  openSettings();
});


ipcMain.on("openConsole", (e) => {
  openConsole();
});