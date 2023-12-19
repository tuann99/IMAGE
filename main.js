const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('node:path');

let mainWindow;

function createWindow() {
  const preloadPath = path.join(app.getAppPath(), 'preload.js');
  console.log('Preload Path:', preloadPath);
  
  mainWindow = new BrowserWindow({
    width: 800,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      preload: preloadPath,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile('index.html');

  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

ipcMain.handle('executePythonScript', async (event, userInput) => {
  console.log("Main process received data from renderer process.");
  console.log("User Input:", userInput);

  const pythonExecutablePath = path.join(app.getAppPath(), 'image-env/Scripts/python.exe');
  const pythonScriptPath = path.join(app.getAppPath(), 'analysis.py');
  console.log('python.exe path:', pythonExecutablePath);
  console.log('script path:', pythonScriptPath);
  
  // Need to add a limit for the number of characters in the input, or at least process
  // the input in chunks

  const pythonProcess = spawn(pythonExecutablePath, [pythonScriptPath, userInput]);
  console.log('Paths created and Python script executed.');

  let outputData = '';
  
  pythonProcess.stdout.on('data', (data) => {
    
    // For if python is sending more than once
    // outputData += data.toString();
    // outputData = JSON.parse(data);
    
    // Using this one because returning entire dict at once
    outputData = data.toString();

    console.log('here is the output:', outputData);
    console.log(typeof outputData);
  });

  // Wait for the Python script to finish executing before returning the output data
  await new Promise((resolve, reject) => {
    pythonProcess.on('close', resolve);
    pythonProcess.on('error', reject);
  });

  return outputData;
});

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (mainWindow === null) createWindow();
});