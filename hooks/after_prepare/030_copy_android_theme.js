#!/usr/bin/env node

/**
 * This hook copies various resource files
 * from our version controlled directories
 * into the appropriate platform specific location
 * (which are not under version control).
 */

var filestocopy = [{
    "config/android/res/values/style.xml":
    "platforms/android/res/values/style.xml"
},{
    "config/android/res/values-v21/style.xml":
    "platforms/android/res/values-v21/style.xml"
}];

var fs = require('fs');
var path = require('path');

var rootdir = process.argv[2];

filestocopy.forEach(function(obj) {
    Object.keys(obj).forEach(function(key) {
        var val = obj[key];
        var srcfile = path.join(rootdir, key);
        var destfile = path.join(rootdir, val);
        var destdir = path.dirname(destfile);

        console.log('Copying ' + srcfile + ' to ' + destdir);

        if (!fs.existsSync(destdir)) {
            fs.mkdirSync(destdir);
        }

        if (fs.existsSync(srcfile) && fs.existsSync(destdir)) {
            fs.createReadStream(srcfile).pipe(fs.createWriteStream(destfile));
        }

    });
});