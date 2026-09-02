const { value } = require("./relative-helper")

exports.execute = function (prefix) {
  return prefix + ":" + value()
}

module.exports.label = "direct"
