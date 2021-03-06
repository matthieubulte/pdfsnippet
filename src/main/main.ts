/* eslint global-require: off, no-console: off, promise/always-return: off */

import path from 'path';
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { promises as fs } from 'fs';
import AsyncLock from 'async-lock';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';

const { exec } = require('child_process');

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDevelopment =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

const gotopage = isDevelopment
  ? './release/app/gotopage.scpt'
  : path.join(process.resourcesPath, 'app.asar.unpacked', 'gotopage.scpt');

const dataFilePath = isDevelopment
  ? './references.json'
  : path.join(app.getPath('userData'), 'references.json');

const dataFileLock = new AsyncLock();

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

ipcMain.on('open-pdf', async (event, { pdfpath, page }) => {
  exec(`osascript "${gotopage}" "${pdfpath}" ${page}`);
});

ipcMain.on('open-web', async (event, { url }) => {
  exec(`open "${url}"`);
});

ipcMain.on('save-references', async (event, references) => {
  dataFileLock.acquire('key', async () => {
    await fs.writeFile(dataFilePath, JSON.stringify(references, null, 4));
  });
});

ipcMain.on('get-references', async (event) => {
  let data = [];
  try {
    const datastr = await fs.readFile(dataFilePath);
    data = JSON.parse(datastr);
    data.forEach((ref) => {
      if (ref.pdfPath) {
        ref.type = 'pdf';
        ref.uri = ref.pdfPath;
      }
    });
  } finally {
    event.reply('get-references', data);
  }
});

if (isDevelopment) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDevelopment) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    title: 'PDF Snippets',
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
