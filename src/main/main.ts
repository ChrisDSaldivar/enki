/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import {
  pbkdf2,
  randomBytes,
  createCipheriv,
  createDecipheriv,
} from 'node:crypto';
import { readFile, access, writeFile } from 'node:fs/promises';
import { promisify } from 'util';
import { Sequelize, DataTypes } from 'sequelize';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import Note from '../models/NotesModel';

app.setAppUserModelId('com.quetzalSoftwareLLC.Enki');

const pbkdf2Promise = promisify(pbkdf2);

(async () => {
  const dir = app.getPath('userData');
  const notesDB = path.join(dir, 'notes-database.sqlite');
  const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: notesDB,
  });

  Note.init(
    {
      commit: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
      },
      lineNumber: {
        type: DataTypes.NUMBER,
        allowNull: false,
        primaryKey: true,
      },
      repo: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
      },
      owner: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
      },
      file: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
      },
      note: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    { sequelize }
  );

  await sequelize.sync();
})();

async function exists(filepath: string) {
  try {
    await access(filepath);
    return true;
  } catch {
    return false;
  }
}

function createCipher(key: Buffer) {
  const iv = randomBytes(64).toString('hex');
  return { iv, cipher: createCipheriv('aes-256-gcm', key, iv) };
}

function createDeCipher(key: Buffer, iv: string) {
  return createDecipheriv('aes-256-gcm', key, iv);
}

async function setAuth(pass: string, authToken: string) {
  const salt = randomBytes(16).toString('hex');
  const key = await pbkdf2Promise(pass, salt, 2145, 32, 'sha512');

  const { iv, cipher } = createCipher(key);
  const cipherText = cipher.update(authToken, 'ascii', 'hex');
  cipher.final();
  const tag = cipher.getAuthTag().toString('hex');

  const dir = app.getPath('userData');
  const authFilename = path.join(dir, 'auth.txt');

  await writeFile(authFilename, `${salt}\n${iv}\n${tag}\n${cipherText}\n`);
}

// AUTH FILE FORMAT
/*
salt for pbkdf2
iv for aes
authTag for aes
authToken
*/

async function getAuth(pass: string): Promise<string | undefined> {
  const dir = app.getPath('userData');
  const authFilename = path.join(dir, 'auth.txt');
  const authFileExists = await exists(authFilename);

  if (!authFileExists) {
    return undefined;
  }

  const authFileContent = await readFile(authFilename);

  const [salt, iv, authTag, encryptedToken] = Buffer.from(authFileContent)
    .toString('ascii')
    .split('\n');

  const key = await pbkdf2Promise(pass, salt, 2145, 32, 'sha512');
  const decipher = createDeCipher(key, iv);

  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  const receivedPlaintext = decipher.update(encryptedToken, 'hex', 'ascii');

  try {
    decipher.final();
    return receivedPlaintext;
  } catch (err) {
    return undefined;
  }
}

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

ipcMain.on('check-auth-file', async (event, arg) => {
  const dir = app.getPath('userData');
  const authFilename = path.join(dir, 'auth.txt');
  const authFileExists = await exists(authFilename);

  event.reply('check-auth-file', { authFileExists });
});

ipcMain.on('get-auth', async (event, arg) => {
  const { pass } = arg[0];
  const authToken = await getAuth(pass);
  event.reply('get-auth', authToken);
});

ipcMain.on('set-auth', async (event, arg) => {
  const { pass, authToken } = arg[0];
  await setAuth(pass, authToken);
  event.reply('set-auth', true);
});

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

ipcMain.on('create-note', async (event, arg) => {
  console.log('Create-note: ');

  console.log(arg[0]);
  await Note.upsert(arg[0]);

  event.reply('create-note', 'note-created');
});

ipcMain.on('get-note', async (event, arg) => {
  console.log('get-note: ');
  const { owner, commit, file, lineNumber } = arg[0];

  console.log();
  const note = await Note.findOne({
    where: { owner, commit, file, lineNumber },
  });

  event.reply('get-note', note?.dataValues);
});

ipcMain.on('get-notes', async (event, arg) => {
  console.log('get-notes: ');

  const { owner, commit, file } = arg[0];
  const notes = await Note.findAll({ where: { owner, commit, file } });

  event.reply('get-notes', notes);
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
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
  if (isDebug) {
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
    width: 1920,
    height: 1080,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
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
