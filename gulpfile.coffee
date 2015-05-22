gulp = require "gulp"
gutil = require "gulp-util"
coffee = require "gulp-coffee"
jasmine = require "gulp-jasmine"
istanbul = require "gulp-istanbul"

gulp.task "default", ["coffee"]

gulp.task "coffee", ["module-coffee", "spec-coffee"]

gulp.task "module-coffee", ->
  gulp.src "src/lib/*.coffee*"
    .pipe coffee({bare:false}).on("error", (error) -> gutil.log error.stack)
    .pipe(gulp.dest ".")

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

gulp.task "prepublish", ["spec", "package-to-bower"]

sync_bower_fields_from_package = {}
gulp.task "package-to-bower", ->
  sync_bower_fields_from_package.json()

sync_bower_fields_from_package.json = ->
  fs = require "fs"

  read_config = (name) ->
    path = "#{name}.json"
    try
      string_config = fs.readFileSync(path, {encoding: "utf8"})
    catch error
      if error.code == "ENOENT"
        string_config = "{}"
      else
        error.message = "Can't read #{path}: #{error.message}"
        throw error
    return JSON.parse(string_config)

  bower = read_config "bower"
  node = read_config "package"

  # The bower.json authors field is an array of strings; package.json has either
  # a single author field which is a string, or a contributors array
  # Here we pretend package.json has an authors field
  #
  {author, contributors} = node
  contributors ?= []
  contributors = contributors.concat(author) if author
  node.authors = contributors if contributors.length > 0

  # These are the bower.json keys we want to copy from package.json
  bower_keys = "name description version main license keywords authors homepage
    repository private".split /\s+/

  for k in bower_keys
    value = node[k]
    if value?
      bower[k] = value
    else
      delete bower[k]

  fs.writeFileSync("bower.json", JSON.stringify(bower, null, 2) + "\n")
