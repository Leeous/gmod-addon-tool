// Modules to control application life and create native browser window
const {app, BrowserWindow, ipcMain } = require('electron')
const fs = require('fs')
const { spawn } = require('child_process');
const settings = require('electron-settings');


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

// exec("gmad.exe", [], {cwd: 'E:\\SteamLibrary\\steamapps\\common\\GarrysMod\\bin\\gmad.exe', shell: true}, function callback(error, stdout, stderr) {
//   console.log("started console app", stdout, stderr, error);
// });

function createWindow () {
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
    mainWindow.on('closed', function () {
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
  app.on('window-all-closed', function () {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') app.quit()
  })
  
  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) createWindow()
  })
  
  // In this file you can include the rest of your app's specific main process
  // code. You can also put them in separate files and require them here.

  ipcMain.on('checkIfDirectoryExists', (event, file) => {

    // const bat = spawn('E:\\SteamLibrary\\steamapps\\common\\GarrysMod\\bin\\gmad.exe', ['create', '-folder', 'E:\\Servers\\Garry\'s Mod Server (DarkRP)\\garrysmod\\addons\\myAddon']);
    
    // bat.stdout.on('data', (data) => {
    //   console.log(data.toString());
    // });
    
    // bat.stderr.on('data', (data) => {
    //   console.log(data.toString());
    // });
    
    // bat.on('exit', (code) => {
    //   console.log(`Child exited with code ${code}`);
    // });

    fs.access(file, fs.constants.R_OK, (err) => {
      console.log(`${file} ${err ? 'is not readable' : 'is readable'}`);
    });

    return true;

  })