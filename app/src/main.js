import 'source-map-support/register';
import fs from 'fs';
import path from 'path';
import electron from 'electron'; //  load electron as powerMonitor can't be required before app is ready
import electronDownload from 'electron-dl';
import jimp from 'jimp';

import createLoginWindow from './components/login/loginWindow';
import createMainWindow from './components/mainWindow/mainWindow';
import createTrayIcon from './components/trayIcon/trayIcon';
import helpers from './helpers/helpers';
import inferFlash from './helpers/inferFlash';



const electronSquirrelStartup = require('electron-squirrel-startup');

// Entrypoint for electron-squirrel-startup.
// See https://github.com/jiahaog/nativefier/pull/744 for sample use case
if (electronSquirrelStartup) {
  electron.app.exit();
}

const { isOSX } = helpers;

const APP_ARGS_FILE_PATH = path.join(__dirname, '..', 'nativefier.json');
const appArgs = JSON.parse(fs.readFileSync(APP_ARGS_FILE_PATH, 'utf8'));

const fileDownloadOptions = Object.assign({}, appArgs.fileDownloadOptions);
electronDownload(fileDownloadOptions);

if (appArgs.processEnvs) {
  Object.keys(appArgs.processEnvs).forEach((key) => {
    /* eslint-env node */
    process.env[key] = appArgs.processEnvs[key];
  });
}

let mainWindow;

if (typeof appArgs.flashPluginDir === 'string') {
  electron.app.commandLine.appendSwitch('ppapi-flash-path', appArgs.flashPluginDir);
} else if (appArgs.flashPluginDir) {
  const flashPath = inferFlash();
  electron.app.commandLine.appendSwitch('ppapi-flash-path', flashPath);
}

if (appArgs.ignoreCertificate) {
  electron.app.commandLine.appendSwitch('ignore-certificate-errors');
}

if (appArgs.disableGpu) {
  electron.app.disableHardwareAcceleration();
}

if (appArgs.ignoreGpuBlacklist) {
  electron.app.commandLine.appendSwitch('ignore-gpu-blacklist');
}

if (appArgs.enableEs3Apis) {
  electron.app.commandLine.appendSwitch('enable-es3-apis');
}

if (appArgs.diskCacheSize) {
  electron.app.commandLine.appendSwitch('disk-cache-size', appArgs.diskCacheSize);
}

if (appArgs.basicAuthUsername) {
  electron.app.commandLine.appendSwitch(
    'basic-auth-username',
    appArgs.basicAuthUsername,
  );
}

if (appArgs.basicAuthPassword) {
  electron.app.commandLine.appendSwitch(
    'basic-auth-password',
    appArgs.basicAuthPassword,
  );
}

// do nothing for setDockBadge if not OSX
let setDockBadge = () => {};

if (isOSX()) {
  let currentBadgeCount = 0;

  setDockBadge = (count, bounce = false) => {
    electron.app.dock.setBadge(count);
    if (bounce && count > currentBadgeCount) electron.app.dock.bounce();
    currentBadgeCount = count;
  };
}

electron.app.on('window-all-closed', () => {
  if (!isOSX() || appArgs.fastQuit) {
    electron.app.quit();
  }
});

electron.app.on('activate', (event, hasVisibleWindows) => {
  if (isOSX()) {
    // this is called when the dock is clicked
    if (!hasVisibleWindows) {
      mainWindow.show();
    }
  }
});

electron.app.on('before-quit', () => {
  // not fired when the close button on the window is clicked
  if (isOSX()) {
    // need to force a quit as a workaround here to simulate the osx app hiding behaviour
    // Somehow sokution at https://github.com/atom/electron/issues/444#issuecomment-76492576 does not work,
    // e.prevent default appears to persist

    // might cause issues in the future as before-quit and will-quit events are not called
    electron.app.exit(0);
  }
});

if (appArgs.crashReporter) {
  electron.app.on('will-finish-launching', () => {
    electron.crashReporter.start({
      companyName: appArgs.companyName || '',
      productName: appArgs.name,
      submitURL: appArgs.crashReporter,
      uploadToServer: true,
    });
  });
}

// quit if singleInstance mode and there's already another instance running
const shouldQuit = appArgs.singleInstance && !electron.app.requestSingleInstanceLock();
if (shouldQuit) {
  electron.app.quit();
} else {
  electron.app.on('second-instance', () => {
    if (mainWindow) {
      if (!mainWindow.isVisible()) {
        // try
        mainWindow.show();
      }
      if (mainWindow.isMinimized()) {
        // minimized
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  electron.app.on('ready', () => {
    mainWindow = createMainWindow(appArgs, electron.app.quit, setDockBadge);
    createTrayIcon(appArgs, mainWindow);

    // Register global shortcuts
    if (appArgs.globalShortcuts) {
      appArgs.globalShortcuts.forEach((shortcut) => {
        electron.globalShortcut.register(shortcut.key, () => {
          shortcut.inputEvents.forEach((inputEvent) => {
            mainWindow.webContents.sendInputEvent(inputEvent);
          });
        });
      });
    }
  });
}

electron.app.on('new-window-for-tab', () => {
  mainWindow.emit('new-tab');
});

electron.app.on('login', (event, webContents, request, authInfo, callback) => {
  // for http authentication
  event.preventDefault();

  if (
    appArgs.basicAuthUsername !== null &&
    appArgs.basicAuthPassword !== null
  ) {
    callback(appArgs.basicAuthUsername, appArgs.basicAuthPassword);
  } else {
    createLoginWindow(callback);
  }
});



/**
 * Prints current date on an empty calendar icon
 * Then callback function to update Electron icon (electron.app.dock.setIcon(image))
 * @param callbackSetIcon
 */
function getCurrentDateIcon(callbackSetIcon){


  var emptyCalendarFile = path.join(__dirname,'./static/CalendarEmptyLogo.png');
  var loadedEmptyCalendar;
  // gets current date
  var currentDateString = new Date().getDate().toString();
  // defines X offset to center the date
  var offsetX = (currentDateString.length < 2) ? 185  : 120;

  // loads empty calendar icon
  jimp.read(emptyCalendarFile)
    .then(function (image) {
      loadedEmptyCalendar = image;
      // loads jimp font
      return jimp.loadFont(path.join(__dirname, './static/fonts/roboto-250-white/roboto-250-white.fnt'))
    })
    .then(function (font) {
     // prints current date on the empty calendar icon
     return loadedEmptyCalendar.print(font, offsetX, 199, currentDateString)
    })
    .then( function (img) {
      // gets the image buffer...
      img.getBuffer(jimp.MIME_PNG, (err, bufferImg) => {
        // ... and callback the function to edit the Electron app dock icon
        callbackSetIcon(bufferImg)
      })
    });
}



// when the app is launched
electron.app.on('activate', () => {
  getCurrentDateIcon( function (bufferImg){
    // Create a native image and set it as dock icon
     electron.app.dock.setIcon(electron.nativeImage.createFromBuffer(bufferImg))
  })
})

// wait the app is ready
electron.app.on('ready', () => {

  getCurrentDateIcon( function (bufferImg){
    // Create a native image and set it as dock icon
    electron.app.dock.setIcon(electron.nativeImage.createFromBuffer(bufferImg))
  })

  // when the screen wakes up
  electron.powerMonitor.on('resume', () => {
    getCurrentDateIcon( function (bufferImg){
      // Create a native image and set it as dock icon
      electron.app.dock.setIcon(electron.nativeImage.createFromBuffer(bufferImg))
    })
  })

  // when user unlocked their mac
  electron.powerMonitor.on('unlock-screen', () => {
    getCurrentDateIcon( function (bufferImg){
      // Create a native image and set it as dock icon
      electron.app.dock.setIcon(electron.nativeImage.createFromBuffer(bufferImg))
    })
  })
})




