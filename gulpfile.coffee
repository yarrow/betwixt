gulp = require "gulp"
gutil = require "gulp-util"
coffee = require "gulp-coffee"
jasmine = require "gulp-jasmine"
istanbul = require "gulp-istanbul"

gulp.task "default", ["coffee"]

gulp.task "coffee", ["lib-coffee", "spec-coffee"]

gulp.task "lib-coffee", ->
  gulp.src "src/lib/*.coffee*"
    .pipe coffee({bare:false}).on("error", (error) -> gutil.log error.stack)
    .pipe(gulp.dest "lib")

gulp.task "spec-coffee", ->
  gulp.src "src/spec/*.coffee*"
    .pipe coffee({bare:false}).on("error", (error) -> gutil.log error.stack)
    .pipe(gulp.dest "spec")

gulp.task "spec", ["coffee"], ->
  gulp.src("spec/*[sS]pec.js")
    .pipe(jasmine({verbose: false, includeStackTrace: true}))

gulp.task "cover", ["coffee"], ->
  gulp.src("lib/*.js")
    .pipe(istanbul())
    .pipe(istanbul.hookRequire())
    .on 'finish', ->
      gulp.src("spec/*[sS]pec.js")
        .pipe(jasmine())
        .pipe(istanbul.writeReports())

