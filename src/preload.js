const { contextBridge, ipcRenderer } = require('electron');

const electronAPI = {
  loginSuccess: (userData) => ipcRenderer.send('login-success', userData),
  login: (payload) => ipcRenderer.invoke('auth:login', payload),
  register: (payload) => ipcRenderer.invoke('auth:register', payload),
  getRemembered: () => ipcRenderer.invoke('auth:get-remembered'),
  resetPassword: (payload) => ipcRenderer.invoke('auth:reset-password', payload),
  resetWithCode: (payload) => ipcRenderer.invoke('auth:reset-with-code', payload),
  clearRemember: () => ipcRenderer.invoke('auth:clear-remember'),
  logout: () => ipcRenderer.send('auth:logout'),
};

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('electronAPI', electronAPI);
} else {
  window.electronAPI = electronAPI;
}