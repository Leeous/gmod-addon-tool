// Modules to control application life and create native browser window
const {
  app,
  BrowserWindow,
  ipcMain
} = require('electron')
const fs = require('fs')
const { spawn } = require('child_process');
const settings = require('electron-settings');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

console.log('\n')

// settings.deleteAll();

// exec("gmad.exe", [], {cwd: 'E:\\SteamLibrary\\steamapps\\common\\GarrysMod\\bin\\gmad.exe', shell: true}, function callback(error, stdout, stderr) {
//   console.log("started console app", stdout, stderr, error);
// });

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
          width: 500,
          height: 250,
          resizable: false,
          fullscreenable: false,
          backgroundColor: "#262626",
          titleBarStyle: "hidden",
          frame: false,
          webPreferences: {
              nodeIntegration: true
          }
      })
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
app.on('ready', createWindow)

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

ipcMain.on('checkIfDirectoryExists', (event, file) => {
  fs.access(file, fs.constants.R_OK, (err) => {
    console.log(`${file} ${err ? 'is not readable' : 'is readable'}`);
  });
})

ipcMain.on('getAddonInfo', () => {
  console.log('trying to get addon info')
  sendClientAddonInfo()
  console.log(settings.get('gmodDirectory'))
})

var ADDON_IDS = []

// We use this to get the addon IDs from gmpublish.exe

function sendClientAddonInfo() {
  const bat = spawn(settings.get('gmodDirectory') + '\\bin\\gmpublish.exe', ['list']);
  bat.stdout.on('data', (data) => {
    var arrayOfOutput = data.toString().split('\n')
    var fixedArray = arrayOfOutput.slice(4, arrayOfOutput.length - 3)
    for (var i = 0; i < fixedArray.length; i++) {
        fixedArray[i] = fixedArray[i].replace('/r', '');
        ADDON_IDS.push([fixedArray[i].substr(0, 11).replace(/\s/g, '').toString()])
    }
  
    console.log('sent to client!')
    mainWindow.webContents.send('message', ADDON_IDS);
  });
}

ipcMain.on('createJsonFile', (event, json, dir) => {
  console.log(json, dir)
  fs.writeFileSync(dir + "\\addon.json", json, 'utf8', (err) => {
    console.log("An error occured while writing JSON Object to File.\n", err);
  })
})

ipcMain.on('createGMAFile', (event, addonDir) => {
  console.log("Addon's Directory: " + addonDir.toString())
  const gmad = spawn(settings.get('gmodDirectory') + '\\bin\\gmad.exe', ['create', '-folder', addonDir]);
  gmad.stdout.on('data', (data) => {
    var arrayOfOutput = data.toString().split('\n')
    var fixedArray = arrayOfOutput.slice(arrayOfOutput.length - 2, arrayOfOutput.length - 1)
    fixedArray = fixedArray[0].match(/(?:"[^"]*"|^[^"]*$)/)[0].replace(/"/g, "")
    var addonGMADir = fixedArray;
    console.log("GMA location: " + addonGMADir);
    mainWindow.webContents.send('addonGMALocation', addonGMADir);
  })
})

ipcMain.on('uploadToWorkshop', (event, gmaDir, iconDir) => {
  const gmpublish = spawn(settings.get('gmodDirectory') + '\\bin\\gmpublish.exe', ['create', '-icon', iconDir, '-addon', gmaDir]);
  gmpublish.stdout.on('data', (data) => {
    console.log(data.toString());
  })
})



// gmpublish.exe create -icon path/to/image512x512.jpg -addon path/to/gma.gma