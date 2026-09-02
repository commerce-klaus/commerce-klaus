const { value } = require("./relative-helper")
const HELPER_ID = "./relative-helper"

exports.execute = function (prefix) {
  return prefix + ":" + value()
}

module.exports.label = "direct"

exports.readInline = function () {
  return require("./relative-helper").value()
}

exports.readConstant = function () {
  return require(HELPER_ID).value()
}
