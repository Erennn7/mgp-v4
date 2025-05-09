const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  ping: () => ipcRenderer.invoke('ping'),
  platform: process.platform
});

// Expose environment variables to the renderer process
contextBridge.exposeInMainWorld('env', {
  apiUrl: 'https://jewelry-management-api.onrender.com/api'
}); 