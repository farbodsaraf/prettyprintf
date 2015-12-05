'use strict';

var _ = require('lodash');
var palettes = require('../printinfo/palettes.js');
var fonts = require('../printinfo/fonts.js');
var snippets = require('../printinfo/snippets.js');
var sizes = [
  {width: 12, height: 16},
  {width: 18, height: 24},
];

var json2csv = require('json2csv');
var fs = require('fs');

function getS3URL(desc) {
  // 12x16-Q_rsqrt.c-Hack-agate.png
  return 'https://s3.amazonaws.com/pretty-printf-thumbnails/' + [
    desc.size.width + 'x' + desc.size.height,
    desc.snippet,
    slugify(desc.font),
    desc.palette,
  ].join('---') + '.png';
}

function getAltText(desc) {
  return desc.snippet + ' in ' + desc.font + ', presented in ' + palettes[desc.palette];
}

function slugify(str) {
  return str.replace(/ /g, '-');
}

var headers = [
  'Handle',
  'Title',
  'Body (HTML)',
  'Vendor',
  'Type',
  'Tags',
  'Published',
  'Option1 Name',
  'Option1 Value',
  'Option2 Name',
  'Option2 Value',
  'Option3 Name',
  'Option3 Value',
  'Variant SKU',
  'Variant Grams',
  'Variant Inventory Tracker',
  'Variant Inventory Qty',
  'Variant Inventory Policy',
  'Variant Fulfillment Service',
  'Variant Price',
  'Variant Compare At Price',
  'Variant Requires Shipping',
  'Variant Taxable',
  'Variant Barcode',
  'Image Src',
  'Image Alt Text',
  'Gift Card',
  'Google Shopping / MPN',
  'Google Shopping / Age Group',
  'Google Shopping / Gender',
  'Google Shopping / Google Product Category',
  'SEO Title',
  'SEO Description',
  'Google Shopping / AdWords Grouping',
  'Google Shopping / AdWords Labels',
  'Google Shopping / Condition',
  'Google Shopping / Custom Product',
  'Google Shopping / Custom Label 0',
  'Google Shopping / Custom Label 1',
  'Google Shopping / Custom Label 2',
  'Google Shopping / Custom Label 3',
  'Google Shopping / Custom Label 4',
  'Variant Image',
  'Variant Weight Unit',
];

var allData = [];

var pairsOfPalettes = _.shuffle([
  ['solarized_dark', 'solarized_light'],
  ['atelier-cave.dark', 'atelier-cave.light'],
  ['darkula', 'atelier-lakeside.light'],
  ['github', 'hybrid'],
  ['kimbie.dark', 'mono-blue'],
  ['paraiso.light', 'monokai_sublime'],
]);

var nextPairIndex = 0;

function shuffleWithPair(pks) {
  pks = _.shuffle(pks);
  var pair = _.shuffle(pairsOfPalettes[nextPairIndex]);

  // remove two
  pks.splice(pks.indexOf(pair[0]), 1);
  pks.splice(pks.indexOf(pair[1]), 1);
  pks.unshift(pair[0]);
  pks.unshift(pair[1]);

  nextPairIndex = (nextPairIndex + 1) % pairsOfPalettes.length;

  return pks;
}

// for each snippet, first generate the main info and create the first row
// then for every other variant

_.each(snippets, (snippet, snippetKey) => {
  // generate first row

  // generate the rest of the rows
  var defaults = {
    'Handle': snippetKey,
    'Option1 Name': 'Color Scheme',
    'Option2 Name': 'Font',
    'Option3 Name': 'Size (inches)',
    'Variant SKU': '',
    'Variant Grams': 50,
    'Variant Inventory Tracker': '',
    'Variant Inventory Qty': 1,
    'Variant Inventory Policy': 'continue',
    'Variant Fulfillment Service': 'manual',
    'Variant Requires Shipping': 'TRUE',
    'Variant Taxable': 'TRUE',
    'Variant Barcode': '',
    'Gift Card': 'FALSE',
  };

  var first = true;

  var pks = shuffleWithPair(_.keys(palettes));
  var fks = _.keys(fonts);

  // for each font
  for (var f = 0; f < fks.length; f++) {
    var font = fks[f];
    // for each palette
    for (var p = 0; p < pks.length; p++) {
      var palette = pks[p];

      for (var s = 0; s < sizes.length; s++) {
        var size = sizes[s];

        var desc = {
          size: size,
          palette: palette,
          font: font,
          snippet: snippetKey,
        };

        console.log(desc);

        // generate row
        var price = size.width === 12 ? '14.99' : '19.99'; // 12x16 = 15, 18x24 = 20

        var newValues = {
          'Option1 Value': palettes[palette],
          'Option2 Value': font,
          'Option3 Value': size.width + 'x' + size.height,
          'Variant Price': price,
          'Variant Compare At Price': price,
          'Image Alt Text': getAltText(desc),
        };

        var url = getS3URL(desc);

        if (first) {
          // first one uses `Image Src`
          newValues = _.extend({}, newValues, {
            'Title': snippet.storeTitle,
            'Body (HTML)': snippet.description,
            'Vender': 'Pretty Printf',
            'Type': 'Print',
            'Published': 'TRUE',
            'Image Src': url,
          });
        } else {
          // the rest use `Variant Image`
          if (size.width === 12) {
            // only upload images for the small sizes, to avoid loading the larger ones
            newValues = _.extend({}, newValues, {
              'Image Src': url,
              'Variant Image': url,
            });
          }
        }

        var row = _.extend({}, defaults, newValues);

        allData.push(row);

        first = false;

      }

    }
  }

});

json2csv({ data: allData, fields: headers }, function(err, csv) {
  if (err) console.log(err);
  fs.writeFile('./prints.csv', csv, function(err) {
    if (err) {
      return console.log(err);
    }
    console.log('Saved CSV');
  });
});

