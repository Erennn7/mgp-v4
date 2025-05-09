const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// Add debugging function
const debug = (message) => {
  console.log(`[PRELOAD DEBUG] ${message}`);
  try {
    const debugPath = path.join(__dirname, '../debug.log');
    fs.appendFileSync(debugPath, `${new Date().toISOString()} - ${message}\n`);
  } catch (err) {
    console.error('Failed to write debug log:', err);
  }
};

debug('Preload script started');

// Check app paths
try {
  const distPath = path.join(__dirname, '../dist');
  const distExists = fs.existsSync(distPath);
  debug(`Dist folder exists: ${distExists}`);
  
  if (distExists) {
    const indexPath = path.join(distPath, 'index.html');
    const indexExists = fs.existsSync(indexPath);
    debug(`index.html exists: ${indexExists}`);
    
    if (indexExists) {
      debug(`Full index.html path: ${indexPath}`);
    }
  }
} catch (err) {
  debug(`Error checking paths: ${err.message}`);
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  ping: () => ipcRenderer.invoke('ping'),
  platform: process.platform,
  debug: (msg) => debug(msg)
});

// Expose environment variables to the renderer process
contextBridge.exposeInMainWorld('env', {
  apiUrl: 'https://jewelry-management-api.onrender.com/api'
});

// Log for debugging
console.log('Preload script executed, API URL set to: https://jewelry-management-api.onrender.com/api');

debug('Preload script completed'); 