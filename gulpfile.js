const fs = require('fs');
const gulp = require('gulp');
const handlebars = require('gulp-compile-handlebars');
const htmlmin = require('gulp-htmlmin');
const s3 = require('gulp-s3-upload')({
  useIAM: true,
});
const AWS = require("aws-sdk");
const inquirer = require("inquirer");

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

gulp.task("cache", function() {
  inquirer
    .prompt([
      {
        type: "list",
        name: "level",
        message: "Cache clear level",
        choices: ["HTML", "Assets", "All"]
      }
    ])
    .then(answers => {
      const cf = new AWS.CloudFront();

      const paths = {
        All: ["/*"],
        Assets: ["/assets/*"],
        HTML: ["/index", "/error", "/honeyfund"]
      };

      cf.createInvalidation(
        {
          DistributionId: "E23DIBMMR6Q28S",
          InvalidationBatch: {
            CallerReference: `${Date.now()}`,
            Paths: {
              Quantity: paths[answers.level].length,
              Items: paths[answers.level]
            }
          }
        },
        function(err, data) {
          if (err) throw err;

          console.log(
            `${answers.level} invalidation ${data.Invalidation.Id} ${
              data.Invalidation.Status
            }`
          ); // successful response
        }
      );
    });
});