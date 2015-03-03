
var fs = require('fs'),
  gulp = require('gulp'),
  del = require('del'),
  vinylPaths = require('vinyl-paths'),
  runSequence = require('run-sequence'),
  stylish = require('jshint-stylish'),
  gulpLoadPlugins = require('gulp-load-plugins'),
  plugins = gulpLoadPlugins({ camelize: true });

//===============================================
// Helpers
//===============================================

// Notify error
function getErrorHandler() {
  return plugins.notify.onError(function(error) {
    console.error(error.message);
    return error.message;
  });
}

//===============================================
// Pre-build tasks
//===============================================

/*
 Clean
 */
gulp.task('clean:before', function() {
  return gulp.src(['./release/**/*.*'])
    .pipe(vinylPaths(del))
    .on('error', getErrorHandler());
});

/*
 Lint the JavaScript
 */
gulp.task('lint:js', function() {
  return gulp.src('./src/js/*.js')
    .pipe(plugins.jshint())
    .on('error', getErrorHandler())
    .pipe(plugins.jshint.reporter(stylish))
    .on('error', getErrorHandler());
});

/*
 Test the JavaScript.
 */
gulp.task('test:js', function() {

  var src = [
    './bower_components/angular/angular.js',
    './src/js/**/*.js',
    './test/spec/**/*.test.js'
  ];

  return gulp.src(src)
    .pipe(plugins.karma({
      configFile: './test/config/karma.conf.js',
      action: 'run'
    }))
    .on('error', getErrorHandler());
});

//===============================================
// Documentation
//===============================================

/*
 Generate the documentation
 */
gulp.task('doc:js', [], function () {

  var pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8')),
    gulpDocs = require('gulp-ngdocs'),
    options = {
      // startPage: '/api',
      // titleLink: '/api',
      title: pkg.name,
      image: '../lib/img/logo.png',
      imageLink: pkg.homepage
    };

  return gulp.src('./src/**/*.js')
    .pipe(gulpDocs.process(options))
    .pipe(gulp.dest('./docs/'))
    .on('error', getErrorHandler());
});

//===============================================
// Build tasks
//===============================================

/*
 Bump the version
 */
function bump(type) {
  return gulp.src(['./package.json'])
    .pipe(plugins.bump({ type: type }))
    .pipe(gulp.dest('./'))
    .on('error', getErrorHandler());
}

gulp.task('bump:prerelease', function() {
  return bump('prerelease');
});

gulp.task('bump:patch', function() {
  return bump('patch');
});

gulp.task('bump:minor', function() {
  return bump('minor');
});

gulp.task('bump:major', function() {
  return bump('major');
});

/*
 Update the persistent build number
 */
gulp.task('update:build', function () {

  var pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

  return gulp.src('./package.json')
    .pipe(plugins.jsonEditor({
      'build': parseInt(pkg.build, 10) + 1,
      'copyright': pkg.organisation + ' ' + new Date().getFullYear(),
      'timestamp': new Date().getTime()
    }, {
      'indent_char': '\t',
      'indent_size': 1
    }))
    .pipe(gulp.dest('./'))
    .on('error', getErrorHandler());
});

/*
 Update the version within bower.json
 */
gulp.task('update-version:bower', function () {

  var pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

  return gulp.src('./bower.json')
    .pipe(plugins.jsonEditor({
      'version': pkg.version
    }, {
      'indent_char': '\t',
      'indent_size': 1
    }))
    .pipe(gulp.dest('./'))
    .on('error', getErrorHandler());
});

/*
 Auto annotate the JavaScript and copy to ./release.
 */
gulp.task('annotate:js', function () {
  return gulp.src('./src/js/service/*.js')
    .pipe(plugins.ngAnnotate({
      remove: true,
      add: true,
      single_quotes: true
    }))
    .pipe(plugins.rename('swx-session-storage.js'))
    .pipe(gulp.dest('./release/'))
    .on('error', getErrorHandler());
});

/*
 Minify/uglify the JavaScript
 */
gulp.task('uglify:js', function() {
  return gulp.src(['./release/swx-session-storage.js'])
    .pipe(plugins.uglifyjs('swx-session-storage.min.js', {
      outSourceMap: true,
      basePath: '/release',
      sourceRoot: '/'
    }))
    .pipe(gulp.dest('./release'))
    .on('error', getErrorHandler());
});

/*
 Add a header comment block
 */
gulp.task('header:js', function() {

  var pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8')),
    banner = ['/**',
      ' * <%= pkg.name %> - <%= pkg.description %>',
      ' * @author <%= pkg.author %>',
      ' * @version v<%= pkg.version %>',
      ' * @build <%= pkg.build %> - ' + new Date(),
      ' * @link <%= pkg.homepage %>',
      ' * @license <%= pkg.license %>',
      ' */',
      ''].join('\n');

  return gulp.src(['./release/*.js'])
    .pipe(plugins.header(banner, { pkg : pkg } ))
    .pipe(gulp.dest('./release'))
    .on('error', getErrorHandler());
});

//===============================================
// Sequenced tasks
//===============================================

gulp.task('default', function(cb) {

  console.info('\nDevelopment build\n');

  runSequence(
    'lint:js',
    // 'test:js',
    'clean:before',
    'bump:prerelease',
    'update:build',
    'update-version:bower',
    'annotate:js',
    'uglify:js',
    'header:js',
    'doc:js', cb);
});

gulp.task('patch', function(cb) {

  console.info('\nPatch build\n');

  runSequence(
    'lint:js',
    // 'test:js',
    'clean:before',
    'bump:patch',
    'update:build',
    'update-version:bower',
    'annotate:js',
    'uglify:js',
    'header:js',
    'doc:js', cb);
});

gulp.task('build', function(cb) {

  console.info('\nMinor build\n');

  runSequence(
    'lint:js',
    'test:js',
    'clean:before',
    'bump:minor',
    'update:build',
    'update-version:bower',
    'annotate:js',
    'uglify:js',
    'header:js',
    'doc:js', cb);
});

gulp.task('release', function(cb) {

  console.info('\nMajor build\n');

  runSequence(
    'lint:js',
    'test:js',
    'clean:before',
    'bump:major',
    'update:build',
    'update-version:bower',
    'annotate:js',
    'uglify:js',
    'header:js',
    'doc:js', cb);
});

//===============================================
// End of file
//===============================================
