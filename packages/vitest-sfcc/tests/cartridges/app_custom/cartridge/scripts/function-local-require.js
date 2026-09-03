exports.ready = function () {
  return true
}

exports.load = function () {
  return require("./unloadable-helper").value()
}
