const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');
const { createServer } = require('./server');

// Setup debug logging
const debug = (message) => {
  console.log(`[MAIN DEBUG] ${message}`);
  try {
    const debugPath = path.join(__dirname, '../debug.log');
    fs.appendFileSync(debugPath, `${new Date().toISOString()} - ${message}\n`);
  } catch (err) {
    console.error('Failed to write debug log:', err);
  }
};

debug('Application starting');
debug(`Electron version: ${process.versions.electron}`);
debug(`Node version: ${process.versions.node}`);
debug(`Chrome version: ${process.versions.chrome}`);

// Check if the app is packaged
const isPackaged = app.isPackaged;
debug(`Is app packaged: ${isPackaged}`);
debug(`App path: ${app.getAppPath()}`);
debug(`App name: ${app.getName()}`);
debug(`Current directory: ${__dirname}`);

// Set API URL for both development and production
process.env.VITE_API_URL = 'https://jewelry-management-api.onrender.com/api';
debug(`API URL set to: ${process.env.VITE_API_URL}`);

// Examine actual dist folder existence and contents
let distPath;
try {
  const possiblePaths = [
    path.join(__dirname, '../dist'),
    path.join(app.getAppPath(), 'dist'),
    path.join(process.cwd(), 'dist'),
    path.join(app.getPath('exe'), '../Resources/app.asar/dist'),
    path.join(app.getPath('exe'), '../Resources/app/dist')
  ];
  
  for (const p of possiblePaths) {
    debug(`Checking for dist directory at: ${p}`);
    if (fs.existsSync(p)) {
      distPath = p;
      debug(`Found dist directory at: ${p}`);
      
      // Check if index.html exists
      const indexPath = path.join(p, 'index.html');
      if (fs.existsSync(indexPath)) {
        debug('index.html exists');
        
        // Check file size
        const stats = fs.statSync(indexPath);
        debug(`index.html size: ${stats.size} bytes`);
        
        // List dist directory files
        const files = fs.readdirSync(p);
        debug(`Dist folder contains: ${files.join(', ')}`);
      } else {
        debug('index.html DOES NOT EXIST!');
      }
      
      break;
    }
  }
  
  if (!distPath) {
    debug('Could not find dist directory in any expected location!');
  }
} catch (err) {
  debug(`Error examining dist folder: ${err.message}`);
}

// Variable to hold local server if needed
let localServer = null;

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;

function createWindow() {
  debug('Creating browser window');
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // Enable dev tools in production for debugging
      devTools: true
    },
    icon: path.join(__dirname, '../assets/icon.png')
  });

  let startUrl;
  
  if (!isPackaged) {
    // In development, load from dev server
    startUrl = 'http://localhost:5173';
    debug('Development mode - loading from dev server');
  } else {
    // In production, first try to load using file protocol
    if (distPath) {
      const indexPath = path.join(distPath, 'index.html');
      debug(`Attempting to load from: ${indexPath}`);
      debug(`File exists: ${fs.existsSync(indexPath)}`);
      
      startUrl = url.format({
        pathname: indexPath,
        protocol: 'file:',
        slashes: true,
      });
    } else {
      // If we can't find the dist path, start a local server as fallback
      debug('Starting local server as fallback...');
      const serverDistPath = path.join(__dirname, '../dist');
      localServer = createServer(serverDistPath);
      startUrl = localServer.url;
      debug(`Local server started at: ${startUrl}`);
    }
    debug(`Production mode - loading from: ${startUrl}`);
  }

  // Load the app with devtools open for debugging
  debug(`Loading URL: ${startUrl}`);
  mainWindow.loadURL(startUrl);
  
  // Open DevTools in both dev and production for debugging
  mainWindow.webContents.openDevTools();
  debug('DevTools opened');

  // Add error handlers
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    debug(`Page failed to load: ${errorDescription} (${errorCode})`);
    
    // Try different loading strategies
    tryAlternativeLoadingStrategies();
  });

  // Function to try different loading strategies
  function tryAlternativeLoadingStrategies() {
    debug('Trying alternative loading strategies...');
    
    // 1. Try loading from local server
    if (!localServer && distPath) {
      debug('Starting local server for fallback...');
      localServer = createServer(distPath);
      const serverUrl = localServer.url;
      debug(`Loading from local server at: ${serverUrl}`);
      mainWindow.loadURL(serverUrl);
      return;
    }
    
    // 2. Try alternative file paths
    const alternativePaths = [
      path.join(app.getAppPath(), 'dist/index.html'),
      path.join(__dirname, '../dist/index.html'),
      path.join(process.cwd(), 'dist/index.html'),
      path.join(app.getPath('exe'), '../Resources/app.asar/dist/index.html'),
      path.join(app.getPath('exe'), '../Resources/app/dist/index.html')
    ];
    
    for (const p of alternativePaths) {
      debug(`Checking alternative path: ${p}`);
      if (fs.existsSync(p)) {
        debug(`Found existing index.html at: ${p}`);
        const urlToLoad = url.format({
          pathname: p,
          protocol: 'file:',
          slashes: true,
        });
        debug(`Loading alternative path: ${urlToLoad}`);
        mainWindow.loadURL(urlToLoad);
        return;
      }
    }
    
    // 3. If all else fails, load the emergency page
    const emergencyPath = path.join(__dirname, 'emergency.html');
    debug(`Loading emergency page from: ${emergencyPath}`);
    
    if (fs.existsSync(emergencyPath)) {
      debug('Emergency page exists, loading it');
      mainWindow.loadFile(emergencyPath);
    } else {
      debug('Emergency page not found! Last resort: showing error message');
      mainWindow.webContents.executeJavaScript(`
        document.body.innerHTML = '<h1>Failed to load application</h1><p>Please check the logs for more information.</p>';
      `);
    }
  }

  mainWindow.webContents.on('crashed', () => {
    debug('Renderer process crashed');
  });

  mainWindow.on('unresponsive', () => {
    debug('Window became unresponsive');
  });
  
  // Listen for console logs from the renderer
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    debug(`[RENDERER] ${message}`);
  });

  // Maximize window on startup
  mainWindow.maximize();

  // Handle window closing
  mainWindow.on('closed', () => {
    // Clean up local server if it was started
    if (localServer) {
      debug('Closing local server');
      localServer.close();
      localServer = null;
    }
    mainWindow = null;
  });
}

// Create window when Electron has finished initialization
app.whenReady().then(() => {
  debug('Electron app is ready, creating window...');
  createWindow();

  // On macOS, it's common to re-create a window when the dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Handle errors
app.on('render-process-gone', (event, webContents, details) => {
  debug(`Renderer process gone: ${details.reason}`);
});

app.on('child-process-gone', (event, details) => {
  debug(`Child process gone: ${details.reason}`);
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  debug('All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Cleanup before quit
app.on('will-quit', () => {
  debug('Application will quit');
  if (localServer) {
    debug('Closing local server');
    localServer.close();
    localServer = null;
  }
});

// IPC communication handlers
ipcMain.handle('ping', () => {
  debug('Ping received from renderer');
  return 'pong';
}); 