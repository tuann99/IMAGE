console.log('preload.js has been loaded');

const {ipcRenderer, contextBridge} = require('electron');

contextBridge.exposeInMainWorld("api",{
    send: (channel, data) => ipcRenderer.send(channel, data),
    receive: (channel, func) => ipcRenderer.on(
        channel, (event, ...args) => func(...args)
    ),
    invoke: (channel, data) => ipcRenderer.invoke(channel, data)
})