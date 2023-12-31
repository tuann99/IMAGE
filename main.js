const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('node:path');
const preloadPath = path.join(app.getAppPath(), 'preload.js');
const fs = require('fs');

let mainWindow;

function createWindow() {
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

ipcMain.handle('mainCheck', async (event, check) => {
  console.log('Main process received check from renderer process.');
  return preloadPath;
});

// ipcMain.on('executePythonScript', (event, userInput) => { // changed to _ for unused variable
ipcMain.on('executePythonScript', (_, userInput) => {
  
  // Check if the user input is valid
  if (userInput === undefined || userInput === null || userInput === '') {
    const errorMsg = 'No user input received.';
    console.log(errorMsg);
    mainWindow.webContents.send('userInputStatus', errorMsg);
    return;
  }
  
  console.log("Main process received data from renderer process.");
  console.log("User Input:", userInput);
  
  const flagFilePath = path.join(__dirname, 'flagFile');
  
  // Properly configure the pyvenv.cfg file if it hasn't been done already
  if (!fs.existsSync(flagFilePath)) { // Check if the flag file exists
    mainWindow.webContents.send('flagFileStatus', 'Flag file does not exist. Creating it now.');

    const pyvenvCfgPath = path.join(__dirname, '/image-env/pyvenv.cfg');
    mainWindow.webContents.send('pyvenvCfgPath', pyvenvCfgPath);

    // Read the pyvenv.cfg file
    let pyvenvCfg = fs.readFileSync(pyvenvCfgPath, 'utf-8');

    // Extract the relative paths
    const homePath = pyvenvCfg.split('\n').find(line => line.startsWith('home')).split('=')[1].trim();
    const relativePythonPath = pyvenvCfg.split('\n').find(line => line.startsWith('executable')).split('=')[1].trim();
    mainWindow.webContents.send('homePath', homePath);
    mainWindow.webContents.send('relativePyvenvPath', relativePythonPath);

    // Construct the absolute paths
    const pythonExecutablePathVenv = path.join(__dirname, relativePythonPath);
    const homePathVenv = path.join(__dirname, homePath);
    mainWindow.webContents.send('finalPyvenvPath', pythonExecutablePathVenv);
    mainWindow.webContents.send('finalHomePath', homePathVenv);

    // Replace the relative paths with the absolute paths in the pyvenv.cfg file
    pyvenvCfg = pyvenvCfg.replace(`executable = ${relativePythonPath}`, `executable = ${pythonExecutablePathVenv}`);
    pyvenvCfg = pyvenvCfg.replace(`home = ${homePath}`, `home = ${homePathVenv}`);

    // Write the modified pyvenv.cfg file back to disk
    fs.writeFileSync(pyvenvCfgPath, pyvenvCfg);
    fs.writeFileSync(flagFilePath, 'This is a flag file. Do not delete it.');
  } else {
    mainWindow.webContents.send('flagFileStatus', 'Flag file exists. No need to create it.');
  }

  const pythonExecutablePath = path.join(app.getAppPath(), 'image-env/Scripts/python.exe');
  const pythonScriptPath = path.join(app.getAppPath(), 'analysis.py');
  const pythonProcess = spawn(pythonExecutablePath, [pythonScriptPath, userInput]);
  
  mainWindow.webContents.send('paths', { pythonExecutablePath, pythonScriptPath });
  console.log('python.exe path:', pythonExecutablePath);
  console.log('script path:', pythonScriptPath);

  // Check if the Python process was created successfully
  if (pythonProcess) {
    const successMsg = 'Python process created successfully.';
    console.log(successMsg);
    mainWindow.webContents.send('pythonProcessStatus', successMsg);
  } else {
    const errorMsg = 'Python process creation failed.';
    console.log(errorMsg);
    mainWindow.webContents.send('pythonProcessStatus', errorMsg);
  }
  
  // Need to add a limit for the number of characters in the input, or at least process
  // the input in chunks

  let outputData = '';
  
  // Listen for any output from the Python script 
  pythonProcess.stdout.on('data', (data) => {
    
    // For if python is sending more than once
    // outputData += data.toString();
    // outputData = JSON.parse(data);
    
    // Using this one because returning entire dict at once
    outputData = data.toString();

    console.log('here is the output:', outputData);
    console.log(typeof outputData);

    mainWindow.webContents.send('pythonOutput', outputData);
  });

  // Listen for any errors on the child process
  pythonProcess.on('error', (error) => {
    console.error('Error from python script execution:', error);
    mainWindow.webContents.send('pythonError', error.message);
  });

  // Listen for any error messages from the Python script
  pythonProcess.stderr.on('data', (data) => {
    console.error('Python script stderr:', data.toString());
    mainWindow.webContents.send('pythonError', data.toString());
  });
});

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (mainWindow === null) createWindow();
});