const { contextBridge, ipcRenderer } = require('electron');

const electronAPI = Object.freeze({
  loginSuccess: (userData) => ipcRenderer.send('login-success', userData),
  login: (payload) => ipcRenderer.invoke('auth:login', payload),
  register: (payload) => ipcRenderer.invoke('auth:register', payload),
  getRemembered: () => ipcRenderer.invoke('auth:get-remembered'),
  resetPassword: (payload) => ipcRenderer.invoke('auth:reset-password', payload),
  resetWithCode: (payload) => ipcRenderer.invoke('auth:reset-with-code', payload),
  clearRemember: () => ipcRenderer.invoke('auth:clear-remember'),
  logout: () => ipcRenderer.send('auth:logout'),
  finance: {
    getState: () => ipcRenderer.invoke('finance:get-state'),
    transactions: {
      create: (payload) => ipcRenderer.invoke('finance:transactions:create', payload),
      update: (payload) => ipcRenderer.invoke('finance:transactions:update', payload),
      delete: (id) => ipcRenderer.invoke('finance:transactions:delete', id),
    },
    budgets: {
      set: (payload) => ipcRenderer.invoke('finance:budgets:set', payload),
      upsert: (payload) => ipcRenderer.invoke('finance:budgets:upsert', payload),
      delete: (name) => ipcRenderer.invoke('finance:budgets:delete', name),
    },
    savings: {
      set: (payload) => ipcRenderer.invoke('finance:savings:set', payload),
      upsert: (payload) => ipcRenderer.invoke('finance:savings:upsert', payload),
      delete: (name) => ipcRenderer.invoke('finance:savings:delete', name),
    },
    reminders: {
      set: (payload) => ipcRenderer.invoke('finance:reminders:set', payload),
      upsert: (payload) => ipcRenderer.invoke('finance:reminders:upsert', payload),
      delete: (name) => ipcRenderer.invoke('finance:reminders:delete', name),
    },
    profile: {
      get: () => ipcRenderer.invoke('finance:profile:get'),
      save: (payload) => ipcRenderer.invoke('finance:profile:save', payload),
    },
  },
});

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('electronAPI', electronAPI);
}