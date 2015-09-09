var gulp = require('gulp'),
  browserify = require('browserify'),
  transform = require('vinyl-transform'),
  watch = require('gulp-watch'),
  watchify = require('watchify'),
  less = require('gulp-less'),
  path = require('path'),
  source = require('vinyl-source-stream'),
  fs = require('fs'),
  plumber = require('gulp-plumber'),
  ngannotate = require('browserify-ngannotate'),
  shim = require('browserify-shim'),
  notify = require('gulp-notify'),
  babelify = require('babelify'),
  html = require('html-browserify'),
  R = require('ramda'),
  requireGlobify = require('require-globify');


var pack = require('./package.json'),
  frontendDependencies = pack['frontendDependencies'];

var joinPath = R.curry(function(root, part) {
  return path.join(root, part);
});

var pub = joinPath('./dist/');

gulp.task('browserify-vendor', function() {
  var vendorBundle = browserify(R.merge(watchify.args, {
    paths: ['./src/js/'],
    debug: false,
    poll: true
  }));

  frontendDependencies.forEach(function(lib) {
    vendorBundle.require(lib);
  });

  return vendorBundle.bundle()
    .pipe(source('vendor.js'))
    .pipe(gulp.dest(pub('js')));
});

// TODO: FIX
gulp.task('browserify-app', function() {
  var appBundleArgs = R.merge(watchify.args, {
    entries: ['./src/js/app.js'],
    paths: ['./src/js/'],
    debug: false,
    extensions: ['.html', '.js']
  });

  var appBundle = watchify(browserify(appBundleArgs))
    .transform(babelify.configure({
      ignore: /(node_modules)/,
      blacklist: ["strict"]
    }))
    .transform(html)
    .transform(ngannotate)
    .transform(requireGlobify);

  frontendDependencies.forEach(function(lib) {
    appBundle.external(lib);
  });

  function bundle() {
    return appBundle
      .bundle()
      .pipe(plumber())
      .pipe(source('app.js'))
      .pipe(gulp.dest(pub('js')));
  }

  appBundle.on('update', function() {
    var updateStart = Date.now();

    console.log("watchify updated, recompiling");
    bundle()
      .on('end', function() {
        console.log('Complete!', (Date.now() - updateStart) + 'ms');
      });
  });

  return bundle();
});

gulp.task('watch', [
  'browserify-vendor',
  'browserify-app'
]);