var nativefier = require('./lib/').default;

// natifier option to build
var options = {
  name: 'Google Calendar', // will be inferred if not specified
  targetUrl: 'https://calendar.google.com/calendar/r',
  icon: './originalCalendarIcon.png',
  inject:['./site.css'],
  counter: false,
  bounce: true,
  width: 1280,
  height: 800,
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36',
  showMenuBar: false,
  titleBarStyle: 'hiddenInset',
  fileDownloadOptions: {
    saveAs: true // always show "Save As" dialog
  }
};


nativefier(options, function(error, appPath) {
  if (error) {
    console.error(error);
    return;
  }
  console.log('App has been nativefied to', appPath);
});
