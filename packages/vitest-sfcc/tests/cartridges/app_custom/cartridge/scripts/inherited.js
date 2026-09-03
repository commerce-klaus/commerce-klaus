const base = module.superModule

module.exports = {
  value: function () {
    return "custom:" + base.value()
  },
}
