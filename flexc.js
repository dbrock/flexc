#!/usr/bin/env node

var format = require("util").format
var fs = require("fs")
var inspect = require("util").inspect
var path = require("path")

var options = require("optimist")
  .boolean("n").alias("n", "dry-run")
  .string("o", "l", "L", "X")
  .argv

var config = {
  directories: [],
  source_files: [],
  library_files: [],
  library_path: [path.join(process.env.HOME, ".flex-lib")],
  libraries: [],
  extra_arguments: [],
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

toArray(options.L).forEach(function (directory) {
  if (!path.existsSync(directory)) {
    die("%s: no such file or directory", directory)
  } else if (!fs.statSync(directory).isDirectory()) {
    die("%s: not a directory", directory)
  } else {
    config.library_path.push(directory)
  }
})

toArray(options.l).forEach(function (name) {
  config.library_path.some(function (directory) {
    var filename = path.join(directory, name)

    if (is_directory(filename)) {
      config.directories.push(filename)
      return true
    } else if (is_file(filename + ".swc")) {
      config.library_files.push(filename + ".swc")
      return true
    } else {
      return false
    }
  }) || die("%s: library not found", name)
})

toArray(options.X).forEach(function (argument) {
  config.extra_arguments.push(argument)
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

option_args.push("-output=" + path.resolve(options["o"] || (
  path.basename(config.source_file).replace(/\.(as|mxml)$/, ".swf")
)))

config.directories.forEach(function (directory) {
  option_args.push("-compiler.library-path+=" + path.resolve(directory))
  option_args.push("-compiler.source-path+=" + path.resolve(directory))
})

config.library_files.forEach(function (filename) {
  option_args.push("-compiler.library-path+=" + path.resolve(filename))
})

option_args = option_args.concat(config.extra_arguments)

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

function is_file(filename) {
  return path.existsSync(filename) && fs.statSync(filename).isFile()
}

function is_directory(filename) {
  return path.existsSync(filename) && fs.statSync(filename).isDirectory()
}
