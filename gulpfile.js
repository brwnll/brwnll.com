const fs = require('fs');
const gulp = require('gulp');
const handlebars = require('gulp-compile-handlebars');
const htmlmin = require('gulp-htmlmin');
const s3 = require('gulp-s3-upload')({
  useIAM: true,
});

const config = require('./config.json');

if (!config) {
  throw new Error('Missing `config.json` file');
}

gulp.task('default', function() {
  gulp.src('src/templates/**')
    .pipe(handlebars(config, {
      batch : ['./src/partials'],
    }))
    .pipe(htmlmin({
      collapseWhitespace: true,
    }))
    .pipe(s3({
      Bucket: config.bucket, 
      ACL: 'public-read',
      keyTransform: (filename) => filename.replace(/\.hbs$/, '.html'),
    }, {
      maxRetries: 5,
    }));

    gulp.src('src/assets/**/*')
      .pipe(s3({
        Bucket: `${config.bucket}/assets`, 
        ACL: 'public-read',
      }, {
        maxRetries: 5,
      }))
});
