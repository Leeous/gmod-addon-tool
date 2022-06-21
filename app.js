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
const homeDir = require('os').homedir();
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let promptWindow;
let addonJSON;
let isWin = process.platform === "win32";
var dtObj = new Date();
var hours = dtObj.getHours();
var minutes = dtObj.getMinutes();
var finalTime = hours + ":" + minutes;
var ADDON_IDS = [];
// Changes extensions to appropriate endings for Linux or Windows 
ext = (isWin) ? ".ico" : ".png";
gmpublishFile = (isWin) ? "gmpublish.exe" : "gmpublish_linux";
gmadFile = (isWin) ? "gmad.exe" : "gmad_linux";
logLocation = (isWin) ? "\\AppData\\Roaming\\gmod-addon-tool\\GMATLog.txt" : "/.gmod-addon-tool/GMATLog.txt";

console.log('\n');

//################//
// Electron stuff //
//################//

function createWindow() {
  app.allowRendererProcessReuse = true;

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 500,
    height: 225,
    resizable: false,
    fullscreenable: false,
    backgroundColor: (settings.get("darkMode") ? "#202020" : "#048CEC"),
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
  // mainWindow.webContents.openDevTools();

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

//#################//
// Settings & logs //
//#################//

// Create log file if it doesn't exist
if (isWin) {
  fs.stat(homeDir + logLocation, function(err, stats) {
    if (err) {
      if (err != null) { console.log(err); }
      fs.access(homeDir + logLocation, fs.constants.F_OK, (err) => {
        console.log("Created log.txt");
        fs.appendFile(homeDir + logLocation, "--- Beginning of log --- \n", 'utf8', (err) => {
        });
      });
    } else {
      fs.appendFile(homeDir + logLocation, "\n-----------------------", 'utf8', (err) => { if (err != null) { console.log(err) } });
    }
  });
} else {
  // Create directory for GMAT logs, if it doesn't exist
  if (!fs.existsSync(homeDir + "/.gmod-addon-tool")) {
    fs.mkdirSync(homeDir + "/.gmod-addon-tool");
  }

  fs.stat(homeDir + logLocation, function(err, stats) {
    if (err) {
      if (err != null) { console.log(err); }
      fs.access(homeDir + logLocation, fs.constants.F_OK, (err) => {
        console.log("Created log.txt");
        fs.appendFile(homeDir + logLocation, "--- Beginning of log --- \n", 'utf8', (err) => {
        });
      });
    }

  });
}

function openSettings(callback) {
  promptWindow = new BrowserWindow({
    width: 250, 
    height: 275,
    parent: mainWindow,
    show: false,
    modal: true,
    title : "Settings",
    autoHideMenuBar: true,
    resizable: false,
    fullscreenable: false,
    backgroundColor: (settings.get("darkMode") ? "#202020" : "#048CEC"),
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
  promptWindow.loadFile("settings.html");
  promptWindow.once('ready-to-show', () => { promptWindow.show();});
}

  ipcMain.on("openSettings", (e) => {
    console.log(__dirname);
    openSettings();
  });


// Writes info to GMATLog.txt
function sendConsoleData(dataArray) {
  dataArray.forEach(data => {
    fs.appendFile(homeDir + logLocation, "\n[" + finalTime + "]" + data, 'utf8', (err) => {});
  });
}

// Also let client tell us about errors
ipcMain.on("logError", (e, error) => {
  sendConsoleData(error);
});

//#####################//
// Addon related logic //
//#####################//

// addon.json related //

// Check if user's addon folder already has addon.json, let client know
function checkIfAddonJSONExist(file) {
  console.log("Checking for addon.json in " + file);
  fs.stat(file + "/addon.json", function(err, stats) {
    console.log((err) ? "User does not have addon.json" : "User already has addon.json");
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

// This creates our addon.json
ipcMain.on('createJsonFile', (event, json, dir) => {
  fs.writeFileSync(dir + "/addon.json", JSON.stringify(json), 'utf8', (err) => {
    if (err != null) {
      mainWindow.webContents.send('errorNote', "An error occured while writing JSON object to file.\n", false, true);
    }
  });
});

// User's current addons //

// This will send the client the IDs of their addons
ipcMain.on('getAddonInfo', () => {
  console.log('Trying to get addon info...');
  sendClientAddonInfo();
  console.log("User's Gmod Directory:" + settings.get('gmodDirectory'));
});

// We use this to get the addon IDs from gmpublish.exe
function sendClientAddonInfo() {
  fs.stat(settings.get('gmodDirectory') + '/bin/gmad.exe', (err, stat) => {
    if (err) {
      mainWindow.webContents.send("wrongDirectory");
    }
  });

  const bat = spawn(settings.get('gmodDirectory') + '/bin/' + gmpublishFile, ['list']);
  bat.stdout.on('data', (data) => {
    sendConsoleData(data.toString().split("\n"));
    var arrayOfOutput = data.toString().split('\n');
    // fixedArray are the lines where we get a 
    var fixedArray = arrayOfOutput.slice(5, arrayOfOutput.length - 3);
    if (data.includes("Couldn't initialize Steam!")) {
      mainWindow.webContents.send('errorNote', "Steam doesn't seem to be open!", true, false);
    }
    if (data.includes("Done.")) { 
      for (var i = 0; i < fixedArray.length; i++) {
        fixedArray[i] = fixedArray[i].replace('/r', '');
        ADDON_IDS.push([fixedArray[i].substr(0, 11).replace(/\s/g, '').toString()]);
      }
      console.log("Addon IDs", ADDON_IDS);
      mainWindow.webContents.send('addonInfo', ADDON_IDS);
    }
  }, (err) => {console.log(err)});

  bat.on('uncaughtException', err => {
    console.error('There was an uncaught error', err);
    alert("bruh")
    process.exit(1); // mandatory (as per the Node.js docs)
  });
}

// Addon creation and uploading //

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
  }), (err) => { console.log(err) };
  gmad.on("error", (err) => {sendConsoleData([err])})
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
      if (data.includes("Success!")) {
        var fixedArray = arrayOfOutput.slice(arrayOfOutput.length - 2, arrayOfOutput.length - 1);
        fixedArray = fixedArray[0].replace(/\D/, '');
        fixedArray = fixedArray.substr(5, fixedArray.length);
        mainWindow.webContents.send('currentAddonID', fixedArray);
      }
    });
  } else {
    // Passes all the info needed to publish a Garry's Mod addon
    const gmpublish = spawn(settings.get('gmodDirectory') + '/bin/' + gmpublishFile, ['create', '-icon', iconDir, '-addon', gmaDir]);
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

// Other things & stuff //

// This will extract a GMA file into the same directory
ipcMain.on("extractAddon", (e, path) => {
  const gmad = spawn(settings.get('gmodDirectory') + '/bin/' + gmadFile, ['extract', '-file', path]);
  gmad.stdout.on("data", (DATA) => sendConsoleData([DATA]));
  gmad.on("error", (err) => sendConsoleData([err]));
  mainWindow.webContents.send("finishExtraction");
});

// Checks to see if the directory the user chooses is writeable 
ipcMain.on('checkIfDirectoryExists', (event, file, jsonCheck) => {
  fs.access(file, fs.constants.R_OK, (err) => {
    console.log(`${file} ${err ? 'is not readable' : 'is readable'}`);
  });
  if (jsonCheck) { checkIfAddonJSONExist(file) }
});

// This will only run the first time the user launches the app or resets settings
if (settings.get("firstRun") == null) {
  settings.set("firstRun", false);
  settings.set("darkMode", false);

  // Check to see if user has Garry's Mod installed on local drive so we can skip getting the directory
  fs.stat((isWin) ? "C:/Program Files (x86)/Steam/steamapps/common/GarrysMod/bin/gmad.exe" : homeDir + "/.local/share/Steam/steamapps/common/GarrysMod", (err, stat) => {
    if (!err) { settings.set("gmodDirectory", (isWin) ? "C:/Program Files (x86)/Steam/steamapps/common/GarrysMod" : homeDir + "/.local/share/Steam/steamapps/common/GarrysMod") }
  });
}