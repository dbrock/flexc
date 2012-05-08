#!/usr/bin/env node

var format = require("util").format
var inspect = require("util").inspect
var path = require("path")

var options = require("optimist")
  .boolean("n").alias("n", "dry-run")
  .string("o").alias("o", "output")
  .argv

var config = {}

if (options._.length === 0) {
  die("nothing to compile")
} else if (options._.length === 1) {
  config.source_file = options._[0]
} else {
  die("error: multiple source files given")
}

var command
var file_args = []
var option_args = []

if (path.existsSync(config.source_file)) {
  command = "mxmlc"
  file_args.push(config.source_file)
  option_args.push("-output=" + path.resolve(options["output"] || (
    config.source_file.replace(/\.(as|mxml)$/, ".swf")
  )))
} else {
  die("%s: no such file or directory", config.source_file)
}

file_args.sort()
option_args.sort()

if (options["n"] || options["dry-run"]) {
  console.log([command].concat(file_args, option_args).join(" "))
} else {
  // XXX
}

function die() {
  console.error("flexc: %s", format.apply(null, arguments))
  process.exit(1)
}
