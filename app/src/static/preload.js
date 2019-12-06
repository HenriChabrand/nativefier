/**
 Preload file that will be executed in the renderer process
 */

/**
 * Note: This needs to be attached prior to the imports, as the they will delay
 * the attachment till after the event has been raised.
 */
document.addEventListener('DOMContentLoaded', () => {
  // Due to the early attachment, this triggers a linter error
  // because it's not yet been defined.
  // eslint-disable-next-line no-use-before-define
  injectScripts();
});

// Disable imports being first due to the above event attachment
import { ipcRenderer } from 'electron'; // eslint-disable-line import/first
import path from 'path'; // eslint-disable-line import/first
import fs from 'fs'; // eslint-disable-line import/first

const INJECT_JS_PATH = path.join(__dirname, '../../', 'inject/inject.js');
const log = require('loglevel');
const notifier = require('node-notifier');
/**
 * Patches window.Notification to:
 * - set a callback on a new Notification
 * - set a callback for clicks on notifications
 * @param createCallback
 * @param clickCallback
 */
function setNotificationCallback(createCallback, clickCallback) {
  var OldNotify = window.Notification;
  var newNotify = function newNotify(title, opt) {

    function sendAlternativeNotification() {
      notifier.notify(
        {
          title: title,
          message: opt.body,
          icon: path.join(__dirname, './originalCalendarIcon.png'),
          timeout: 7200,
          sound: 'Funk',
          actions: 'Snooze'
        },
        function (error, response, metadata) {
          if (metadata.activationType === 'contentsClicked') {
            // ... call nativefier's clickCallback function (will show the app if it's closed)
            clickCallback(response, metadata);
            // else if an action is clicked and the action is "Snooze"
          } else if (metadata.activationType === 'actionClicked' && metadata.activationValue === 'Snooze') {
            // wait five minutes...
            setTimeout(function () {
              // ...and resend the notification
              sendAlternativeNotification();
            }, 300000);
          }
        });
      }

    // send the alternative notification
    sendAlternativeNotification();
    createCallback(title, opt);
    // avoid the native notification to be sent
    return null;
  };
  
  // nativefier code
  newNotify.requestPermission = OldNotify.requestPermission.bind(OldNotify);
  Object.defineProperty(newNotify, 'permission', {
    get: function get() {
      return OldNotify.permission;
    }
  });  
  window.Notification = newNotify;
}

function injectScripts() {
  const needToInject = fs.existsSync(INJECT_JS_PATH);
  if (!needToInject) {
    return;
  }
  // Dynamically require scripts
  // eslint-disable-next-line global-require, import/no-dynamic-require
  require(INJECT_JS_PATH);
}

function notifyNotificationCreate(title, opt) {
  ipcRenderer.send('notification', title, opt);
}
function notifyNotificationClick() {
  ipcRenderer.send('notification-click');
}

setNotificationCallback(notifyNotificationCreate, notifyNotificationClick);

ipcRenderer.on('params', (event, message) => {
  const appArgs = JSON.parse(message);
  log.info('nativefier.json', appArgs);
});

ipcRenderer.on('debug', (event, message) => {
  // eslint-disable-next-line no-console
  log.info('debug:', message);
});
