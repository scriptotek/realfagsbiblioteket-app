var gulp = require('gulp');
var bower = require('bower');
var minifyCss = require('gulp-minify-css');
var sh = require('shelljs');
var fs = require('fs');
var plugins = require('gulp-load-plugins')();
var del = require('del');
var lazypipe = require('lazypipe');

// Largely influenced by https://github.com/flavordaaave/ionic-better-structure

// var args = require('yargs').argv;

gulp.task('default', ['build']);



/**
 * Order a stream
 * @param   {Stream} src   The gulp.src stream
 * @param   {Array} order Glob array pattern
 * @returns {Stream} The ordered stream
 */
function orderedStream (src, order) {
    //order = order || ['**/*'];
    return gulp
        .src(src, {read: false})
        .pipe(plugins.if(order, plugins.order(order)));
}


/**
 * Log a message or series of messages using chalk's blue color.
 * Can pass in a string, object or array.
 */
function log(msg) {
    if (typeof(msg) === 'object') {
        for (var item in msg) {
            if (msg.hasOwnProperty(item)) {
                plugins.util.log(plugins.util.colors.blue(msg[item]));
            }
        }
    } else {
        plugins.util.log(plugins.util.colors.blue(msg));
    }
}


/**
 * Inject files in a sorted sequence at a specified inject label
 * @param   {Array} src   glob pattern for source files
 * @param   {String} label   The label name
 * @param   {Array} order   glob pattern for sort order of the files
 * @returns {Stream}   The stream
 */
function inject(src, label, order) {
  var options = {
    relative: true
  };
  if (label) {
    options.name = 'inject:' + label;
  }

  return plugins.inject(orderedStream(src, order), options);
}


/**
 * Delete all files in a given path
 * @param  {Array}   path - array of paths to delete
 * @param  {Function} done - callback when complete
 */
function clean(path, done) {
    log('Cleaning: ' + plugins.util.colors.blue(path));
    del(path).then(function() {
      done();
    });
}

/**
 * Remove all files from the build and temp folder
 * @param  {Function} done - callback when complete
 */
gulp.task('clean', ['clean-code'], function(done) {
    var delconfig = [].concat('./www/**/*', './src/.tmp/');
    log('Cleaning: ' + plugins.util.colors.blue(delconfig));
    del(delconfig, done);
});


/**
 * Remove all js and html from the build and temp folders
 * @param  {Function} done - callback when complete
 */
gulp.task('clean-code', function(done) {
    var files = [].concat(
        './www/js/**/*.js',
        './www/**/*.html'
    );
    clean(files, done);
});


/**
 * Remove all fonts from the build folder
 * @param  {Function} done - callback when complete
 */
gulp.task('clean-fonts', function(done) {
    clean('./www/fonts/**/*.*', done);
});

/**
 * Remove all images from the build folder
 * @param  {Function} done - callback when complete
 */
gulp.task('clean-images', function(done) {
    clean('./www/images/**/*.*', done);
});


/**
 * Copy ionic fonts
 * @return {Stream}
 */
gulp.task('fonts', ['clean-fonts'], function() {
    log('Copying fonts');

    return gulp
        .src('./src/lib/ionic/fonts/**/*.*')
        .pipe(gulp.dest('./www/fonts'));
});

/**
 * Compress images
 * @return {Stream}
 */
gulp.task('images', ['clean-images'], function() {
    log('Compressing and copying images');

    return gulp
        .src('./src/images/**/*.*')
        .pipe(plugins.imagemin({optimizationLevel: 4}))
        .pipe(gulp.dest('./www/images'));
});


/**
 * Compile sass to css
 * @return {Stream}
 */
gulp.task('styles', [/*'clean-styles'*/], function(done) {
    log('Compiling SASS --> CSS');

    return gulp
        .src('./src/styles/ionic.app.scss')
        .pipe(plugins.sass({
            errLogToConsole: true
        }))
        .pipe(gulp.dest('./src/.tmp/'));
});



gulp.task('inject', ['vet', 'styles'], function() {
    log('Inject css and js into index');

    // It's not necessary to read the files (will speed up things), we're only after their paths.
    var sources = ['./src/app/**/*.js', './src/contrib/**/*.js']; //, '!./src/app/constants.js', './www/build/js/constants.js'];

    var jsOrder = [
      '**/app.js',
      '**/*.module.js',
      '**/*.js',
    ];

    return gulp
        .src('./src/index.html')
        .pipe(inject(sources, null, jsOrder))
        .pipe(gulp.dest('./src/'));
});


/**
 * vet the code
 * @return {Stream}
 */
gulp.task('vet', function() {
    log('Analyzing source with ESLint');

    return gulp
        .src('./src/app/**/*.js')
        .pipe(plugins.eslint())
        .pipe(plugins.eslint.format())
        .pipe(plugins.eslint.failAfterError());
});




gulp.task('watch', ['inject'], function() {
   gulp.watch('./src/styles/*.scss', ['styles']);
   gulp.watch('./src/app/**/*.js', ['vet']);
});

gulp.task('install', ['git-check'], function() {
  return bower.commands.install()
    .on('log', function(data) {
      plugins.util.log('bower', plugins.util.colors.cyan(data.id), data.message);
    });
});

gulp.task('git-check', function(done) {
  if (!sh.which('git')) {
    console.log(
      '  ' + plugins.util.colors.red('Git is not installed.'),
      '\n  Git, the version control system, is required to download Ionic.',
      '\n  Download git here:', plugins.util.colors.cyan('http://git-scm.com/downloads') + '.',
      '\n  Once git is installed, run \'' + plugins.util.colors.cyan('gulp install') + '\' again.'
    );
    process.exit(1);
  }
  done();
});



/**
 * Create $templateCache from the html templates
 * @return {Stream}
 */
gulp.task('templatecache', [], function() {
    log('Creating an AngularJS $templateCache');

    return gulp
        .src('./src/app/**/*.html')
        // .pipe(plugins.if(args.verbose, plugins.bytediff.start()))
        //.pipe(plugins.minifyHtml({empty: true}))
        // .pipe(plugins.if(args.verbose, plugins.bytediff.stop(bytediffFormatter)))
        .pipe(plugins.angularTemplatecache(
            'templates.js',
            {
              module: 'app.core',
              root: 'app/',
              standalone: false,
            }
        ))
        .pipe(gulp.dest('./src/.tmp/'));
});




var settings = JSON.parse(fs.readFileSync('./config/env.json', 'utf8'));

var injectScanditKey = lazypipe()
  //.pipe(plugins.debug, {title: 'injectScanditKey:'})
  .pipe(plugins.replaceTask, {
    patterns: [
      {
        match: 'scanditKey',
        replacement: settings.scandit_key
      }
    ]
  });

var minifyCss = lazypipe()
  //.pipe(plugins.debug, {title: 'minifyCss:'})
  .pipe(plugins.minifyCss)
  .pipe(plugins.cssUrlAdjuster, {
    replace: ['../lib/ionic/fonts','../fonts'],
  });


/**
 * Optimize all files, move to a build folder,
 * and inject them into the new index.html
 * @return {Stream}
 */
gulp.task('optimize', ['inject', 'templatecache'], function() {
    log('Optimizing the js, css, and html');

    return gulp
        .src('./src/index.html')
        .pipe(inject('./src/.tmp/templates.js', 'templates'))
        .pipe(plugins.useref())

        .pipe(plugins.if('**/app.js', injectScanditKey()))
        .pipe(plugins.if('**/app.js', plugins.stripDebug()))
        .pipe(plugins.if('*.css', minifyCss()))

        // .pipe(plugins.if('**/app.js', plugins.ngAnnotate({add: true})))
        // .pipe(plugins.if('**/app.js', plugins.uglify()))

        .pipe(gulp.dest('./www/'));

        // .pipe(plugins.useref())
        // .pipe(plugins.if('**/' + config.optimized.app, plugins.ngAnnotate({add: true})))
        // .pipe(plugins.if('**/' + config.optimized.app, plugins.uglify()))
        // .pipe(plugins.if('**/' + config.optimized.lib, plugins.uglify()))

        // .pipe(plugins.useref())
        // .pipe('./build/');
});


/**
 * Build everything
 * This is separate so we can run tests on
 * optimize before handling image or fonts
 */
gulp.task('build', ['optimize', 'images', 'fonts'], function() {
    log('Building everything');

    var msg = {
        title: 'gulp build',
        subtitle: 'Deployed to the build folder'
    };
    // del(config.temp);
    log(msg);
});

