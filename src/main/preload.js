const { contextBridge, ipcRenderer } = require('electron');

const validChannels = ['ipc-example', 'get-references', 'save-references'];

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    openPdf(pdfpath, page) {
      ipcRenderer.send('open-pdf', { pdfpath, page });
    },
    saveReferences(references) {
      ipcRenderer.send('save-references', references);
    },
    getReferences() {
      ipcRenderer.send('get-references');
    },
    on(channel, func) {
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    },
    once(channel, func) {
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        ipcRenderer.once(channel, (event, ...args) => func(...args));
      }
    },
  },
});
