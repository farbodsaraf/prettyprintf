'use strict';

var system = require('system');
var args = system.args;

console.log(args);

if (args.length < 6) {
  console.warn('Not all arguments supplied, oh noes....');
  phantom.exit();
}

var ppi = 300;

var size = {
  width: parseInt(args[1], 10),
  height: parseInt(args[2], 10),
};

var data = {
  snippet: args[3],
  font: args[4],
  palette: args[5],
};

var page = require('webpage').create();
page.viewportSize = {
  width: size.width * ppi,
  height: size.height * ppi,
};

var url = 'http://localhost:3000/?' + qs(data);

console.log(url);

page.onResourceReceived = function(res) {
  console.log(res.url);
  console.log(res.status);
};

page.open(url, function(status) {
  setTimeout(function() {
    setTimeout(function() {
      console.log(status);
      page.render(filename(), {format: 'png', quality: '100'});
      phantom.exit();
    }, 2000);
  }, 1);
});

function filename() {
  return 'images/full/' + [
    size.width + 'x' + size.height,
    data.snippet,
    slugify(data.font),
    data.palette,
  ].join('---') + '.png';
}

function qs(data) {
  var ks = Object.keys(data);
  var r = [];
  for (var i in ks) {
    var k = ks[i];
    r.push(k + '=' + encodeURIComponent(data[k]));
  }

  return r.join('&');
}

function slugify(str) {
  return str.replace(/ /g, '-');
}

// <size>-<snippet>-<font>-<palette>.png
