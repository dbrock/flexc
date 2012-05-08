#!/usr/bin/env node

var format = require("util").format
var inspect = require("util").inspect
var path = require("path")

var options = require("optimist")
  .boolean("n").alias("n", "dry-run")
  .string("o").alias("o", "output")
  .string("I").alias("I", "source-directory")
  .argv

var config = {
  source_directories: []
}

if (options._.length === 0) {
  die("nothing to compile")
} else if (options._.length > 1) {
  die("error: multiple source files given")
} else if (path.existsSync(options._[0])) {
  config.source_file = options._[0]
} else {
  die("%s: no such file or directory", options._[0])
}

toArray(options["source-directory"]).forEach(function (value) {
  config.source_directories.push(value)
})

var command = "mxmlc"
var file_args = []
var option_args = []

file_args.push(config.source_file)

option_args.push("-output=" + path.resolve(options["output"] || (
  config.source_file.replace(/\.(as|mxml)$/, ".swf")
)))

config.source_directories.forEach(function (directory) {
  option_args.push("-include-sources+=" + path.resolve(directory))
})

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

function toArray(value) {
  return value === undefined ? [] : Array.isArray(value) ? value : [value]
}
