#!/usr/bin/env node

var format = require("util").format
var fs = require("fs")
var inspect = require("util").inspect
var path = require("path")
var simplify = require("flex-simplify-errors")
var tty = require("tty")

var options = require("optimist")
  .string("o", "l", "L", "X")
  .boolean("n").alias("n", "dry-run")
  .boolean("raw")
  .boolean("production")
  .boolean("flex").default("flex", true)
  .boolean("static-rsls")
  .boolean("halo")
  .boolean("write-config")
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
  } else if (~[".swc"].indexOf(path.extname(filename))) {
    config.library_files.push(filename)
  } else if (~[".as", ".mxml"].indexOf(path.extname(filename))) {
    config.source_files.push(filename)
  } else {
    die("%s: unrecognized source or library file")
  }
})

toArray(options["L"]).forEach(function (directory) {
  if (!path.existsSync(directory)) {
    die("%s: no such file or directory", directory)
  } else if (!fs.statSync(directory).isDirectory()) {
    die("%s: not a directory", directory)
  } else {
    config.library_path.push(directory)
  }
})

toArray(options["l"]).forEach(function (name) {
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

toArray(options["X"]).forEach(function (argument) {
  config.extra_arguments.push(argument)
})

if (!options["production"]) {
  config.extra_arguments.push("-debug")
}

if (!options["flex"]) {
  config.extra_arguments.push("-runtime-shared-library-path=")
}

if (options["static-rsls"]) {
  config.extra_arguments.push("-static-link-runtime-shared-libraries=true")
}

if (options["halo"]) {
  config.extra_arguments.push("-theme=" + path.join(
    require("flex-compiler").home, "frameworks/themes/Halo/halo.swc"
  ))
}

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
// Generate Flex compiler configuration
//——————————————————————————————————————————————————————————————————————

var flex_config = {
  output: path.resolve(options["o"] || (
    path.basename(config.source_file).replace(/\.(as|mxml)$/, ".swf")
  )),

  source_path: config.directories.map(path.resolve),

  library_path: [].concat(
    config.directories, config.library_files
  ).map(path.resolve)
}

//——————————————————————————————————————————————————————————————————————
// Generate Flex compiler command
//——————————————————————————————————————————————————————————————————————

var command = "mxmlc"
var file_args = []
var option_args = []
var flex_config_xml

file_args.push(path.resolve(config.source_file))

if (options["write-config"]) {
  flex_config_xml = require("pretty-data").pd.xml(build_xml(
    new (require("libxmljs").Document), function (xml) {
      build_xml(xml.node("flex-config"), function (xml) {
        xml.node("load-config", "${flexlib}/${configname}-config.xml")
        xml.node("output", flex_config.output)
        build_xml(xml.node("compiler"), function (xml) {
          build_xml(xml.node("source-path"), function (xml) {
            xml.attr("append", "true")
            flex_config.source_path.forEach(function (element) {
              xml.node("path-element", element)
            })
          })
          build_xml(xml.node("library-path"), function (xml) {
            xml.attr("append", "true")
            flex_config.library_path.forEach(function (element) {
              xml.node("path-element", element)
            })
          })
        })
      })
    }
  ).toString())
} else {
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
}

file_args.sort()
option_args.sort()

option_args = option_args.concat(config.extra_arguments)

//——————————————————————————————————————————————————————————————————————
// Perform compilation
//——————————————————————————————————————————————————————————————————————

var args = [command].concat(file_args, option_args)

if (!options["dry-run"]) {
  if (options["write-config"]) {
    fs.writeFileSync(config.source_file.replace(
      (/(\.(as|mxml))?$/), "-config.xml"
    ), flex_config_xml)
  }

  require("flex-compiler").run(args, function (ok, output) {
    process.stdout.write(options.raw ? output : simplify(output, {
      colors: tty.isatty(process.stdout.fd)
    }))

    process.exit(ok ? 0 : 1)
  })
} else if (flex_config_xml) {
  console.log(flex_config_xml)
} else {
  console.log(args.join(" \\\n  "))
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

function build_xml(xml, callback) {
  callback(xml); return xml
}
