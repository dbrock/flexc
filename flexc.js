#!/usr/bin/env node

var format = require("util").format
var fs = require("fs")
var inspect = require("util").inspect
var path = require("path")

var options = require("optimist")
  .boolean("n").alias("n", "dry-run")
  .string("o").alias("o", "output")
  .argv

var config = {
  directories: [],
  source_files: [],
  library_files: [],
  target: undefined
}

//——————————————————————————————————————————————————————————————————————
// Parse command-line options
//——————————————————————————————————————————————————————————————————————

options._.forEach(function (filename) {
  if (!path.existsSync(filename)) {
    die("%s: no such file or directory", filename)
  } else if (fs.statSync(filename).isDirectory()) {
    config.directories.push(filename)
  } else {
    config.source_files.push(filename)
  }
})

//——————————————————————————————————————————————————————————————————————
// Validate configuration
//——————————————————————————————————————————————————————————————————————

if (config.source_files.length === 1) {
  config.source_file = config.source_files[0]
} else if (config.source_files.length) {
  die("error: multiple source files given")
} else {
  die("nothing to compile")
}

//——————————————————————————————————————————————————————————————————————
// Generate Flex compiler command
//——————————————————————————————————————————————————————————————————————

var command = "mxmlc"
var file_args = []
var option_args = []

file_args.push(path.resolve(config.source_file))

option_args.push("-output=" + path.resolve(options["output"] || (
  path.basename(config.source_file).replace(/\.(as|mxml)$/, ".swf")
)))

config.directories.forEach(function (directory) {
  option_args.push("-compiler.library-path+=" + path.resolve(directory))
  option_args.push("-compiler.source-path+=" + path.resolve(directory))
})

file_args.sort()
option_args.sort()

//——————————————————————————————————————————————————————————————————————
// Perform compilation
//——————————————————————————————————————————————————————————————————————

var args = [command].concat(file_args, option_args)

if (options["n"] || options["dry-run"]) {
  console.log(args.join(" "))
} else {
  require("flex-compiler").__main__(args)
}

//——————————————————————————————————————————————————————————————————————
// Utility functions
//——————————————————————————————————————————————————————————————————————

function die() {
  console.error("flexc: %s", format.apply(null, arguments))
  process.exit(1)
}

function toArray(value) {
  return value === undefined ? [] : Array.isArray(value) ? value : [value]
}
