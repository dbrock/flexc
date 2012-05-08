#!/usr/bin/env node

var colors = require("colors")
var exec = require("child_process").exec
var inspect = require("util").inspect
var path = require("path")

var n_tests = 0

process.chdir(__dirname)

require("libxmljs").parseXmlString(
  require("fs").readFileSync(
    __dirname + "/../flexc-test-cases.html"
  ).toString()
).find("//dt").forEach(function (dt, test_index) {
  var command = dt.text().replace(/^flexc\b/, __dirname + "/../flexc.js")
  var expected = {
    stdout: parse_dd(dt.get("following-sibling::*[" + (
      "position()<=2 and name()='dd' and (@class='stdout' or not(@class))"
    ) + "]")),
    stderr: parse_dd(dt.get("following-sibling::*[" + (
      "position()<=2 and name()='dd' and @class='stderr'"
    ) + "]"))
  }

  exec(command, function (error, stdout, stderr) {
    if (stdout === expected.stdout && stderr === expected.stderr) {
      ++n_tests
    } else {
      dump("Test #" + (test_index + 1) + " failed:", command)
      dump("Expected stdout:", expected.stdout)
      dump("Actual stdout:", stdout)
      dump("Expected stderr:", expected.stderr)
      dump("Actual stderr:", stderr)
      n_tests = null
      process.exit(1)
    }
  })
})

function parse_dd(dd) {
  var result

  if (!dd) {
    result = ""
  } else if (dd.get("div")) {
    result = dd.find("div").map(function (div) {
      return normalize(div.text()) + "\n"
    }).join("")
  } else {
    result = normalize(dd.text()) + "\n"
  }

  return result.replace(/\$PWD\b/g, path.resolve(__dirname))
}

function normalize(text) {
  return text.replace(/^\s+|\s+$/g, "").replace(/\s+/g, " ")
}

function dump(label, text) {
  console.error(colors.bold(label))

  if (text.indexOf("\n") >= 0) {
    console.error(
      text.replace(/\n$/, "").split("\n").map(function (line, index) {
        return colors.white((index + 1) + " ┃ ") + line
      }).join("\n")
    )
  } else if (text) {
    console.error("  " + text)
  } else {
    console.error(colors.grey("  (empty)"))
  }
}

process.on("exit", function () {
  if (n_tests !== null) {
    console.log("OK (ran %d tests).", n_tests)
  }
})
