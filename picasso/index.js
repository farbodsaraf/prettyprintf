'use strict';

/*
  serve up a webpage based on the query params of the request

  font: Font to Use
  palette: key for one of the highlight.js palettes
  title: text to use as the title
  snippet: key for one of the supported code blocks
*/

var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var path = require('path');
var cons = require('consolidate');
var express = require('express');
var palettes = Object.keys(require('./printinfo/palettes.js'));
var snippets = require('./printinfo/snippets.js');
var fonts = require('./printinfo/fonts.js');
var _ = require('lodash');
var css  = require('css');

var async = require('async');

var childProcess = require('child_process');
var slimerjs = require('slimerjs');
var binPath = slimerjs.path;

var app = express();
app.engine('hbs', cons.handlebars);
app.set('view engine', 'hbs');
app.set('views', __dirname + '/views');

app.use('/fonts', express.static('fonts'));
app.use('/palettes', express.static('node_modules/highlightjs/styles'));

app.get('/highlight.pack.min.js', (req, res) => {
  res.sendFile(__dirname + '/node_modules/highlightjs/highlight.pack.min.js');
});

app.get('/', (req, res) => {

  var data = {};

  Promise.resolve()
    .then(() => {
      // verify title is correct
      // if (req.query.title === undefined || req.query.title.length === 0) {
      //   throw new Error('Title "%s" is not valid.', req.query.title);
      // }
      // console.log('Title "%s" is good...', req.query.title);
    })
    .then(() => {
      // verify palette is correct
      if (!req.query.palette || palettes.indexOf(req.query.palette) === -1) {
        throw new Error('Palette "%s" is not valid', req.query.palette);
      }
      console.log('Palette "%s" is good...', req.query.palette);
    })
    .then(() => {
      // verify snippet source is correct
      if (Object.keys(snippets).indexOf(req.query.snippet) === -1) {
        throw new Error('Snippet "%s" is not valid', req.query.snippet);
      }

      console.log('Snippet "%s" is good...', req.query.snippet);
    })
    .then(() => {
      // verify font is correct
      if (Object.keys(fonts).indexOf(req.query.font) === -1) {
        throw new Error('Font "%s" is not valid', req.query.font);
      }
      console.log('Font "%s" is good...', req.query.font);
    })
    // finally load all of the required things
    .then(() => {

      // data.title = req.query.title;
      data.palette = req.query.palette;

      data.fontFamily = req.query.font;

      data = _.extend(data, snippets[req.query.snippet]);

      return cons.handlebars('views/fontFace.hbs', {fontFaces: fonts[req.query.font]})
        .then((text) => {
          data.fontFace = text;
        });

    })
    .then(() => {
      // parse the style css for the color information I care about

      return fs.readFileAsync('node_modules/highlightjs/styles/' + req.query.palette + '.css', 'utf-8')
        .then((text) => {
          var ast = css.parse(text);
          var base03 = getValueOfSelectorProperty(ast, '.hljs', 'background');
          if (base03 === undefined) {
            // sometimes they use background-color instead of background
            base03 = getValueOfSelectorProperty(ast, '.hljs', 'background-color');
          }
          var base0 = getValueOfSelectorProperty(ast, '.hljs', 'color');
          if (base0 === undefined) {
            // sometimes they don't defined a default color, so instead we use the keyword's
            base0 = getValueOfSelectorProperty(ast, '.hljs-keyword', 'color');
          }

          data.base03 = base03;
          data.base0 = base0;
        });

    })
    .then(() => {
      return fs.readFileAsync('snippets/' + req.query.snippet, 'utf-8')
      .then((snippet) => {
        data.lang = path.extname(req.query.snippet).substring(1);
        data.snippet = snippet;
      });
    })
    .then(() => {
      console.log(data);
      res.render('index', data);
    })
    .catch((err) => {
      console.log(err.stack);
      res.send(err.message);
    });
});

var server = app.listen(3000, () => {
  var port = server.address().port;

  console.log('Example app listening on port %s', port);

  // After making the server, trigger phantomjs to visit the page for every permutation of the items

  if (process.env.GENERATE_PRINTS) {

    var fontKeys = Object.keys(fonts);
    var paletteKeys = palettes;
    var sizes = [{width: 12, height: 16}, {width: 18, height: 24}];
    var snippetKeys = Object.keys(snippets);

    var q = async.queue((task, done) => {
      var childArgs = [
        path.join(__dirname, '../thedream/index.js'),
        task.size.width,
        task.size.height,
        task.snippet,
        task.font,
        task.palette,
      ];

      console.log('"' + childArgs.join('" "') + '"');

      childProcess.execFile(binPath, childArgs, done);
    }, process.env.PP_CONCURRENCY || 10);

    q.drain = function() {
      // all items parsed

      console.log('DONE GENERATING PRETTY PRINTS');
      process.exit(0);
    };

    _.each(snippetKeys, function(snippet) {
      _.each(paletteKeys, function(palette) {
        _.each(fontKeys, function(font) {
          _.each(sizes, function(size) {
            q.push({size, font, palette, snippet});
          });
        });
      });
    });
  }

});

function getValueOfSelectorProperty(ast, selector, property) {
  var onlyRules = _.filter(ast.stylesheet.rules, (r) => {
    return r.type === 'rule';
  });

  var onlySelectorRules = _.filter(onlyRules, (r) => {
    return r.selectors.indexOf(selector) !== -1;
  });

  var onlySelectorDeclarations = _.flatten(_.map(onlySelectorRules, (r) => { return r.declarations; }));

  var possibleDeclarationsForProperty = _.filter(onlySelectorDeclarations, (d) => {
    return d.property === property;
  });

  var possibleValuesForProperty = _.map(possibleDeclarationsForProperty, (d) => { return d.value; });

  return _.first(possibleValuesForProperty);

}
