
'use strict';

var fs = require('fs');
var path = require('path');
var p = path.join(__dirname, '../images/full');
fs.readdir(p, function(err, files) {
  for (var i = 0; i < files.length; i++) {
    var oldName = files[i];
    var newName =
  };
  // fs.renameSync(oldPath, newPath)
});
