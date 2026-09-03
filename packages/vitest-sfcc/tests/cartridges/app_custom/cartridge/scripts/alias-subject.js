const provider = require("app_base/cartridge/scripts/provider")

module.exports = {
  execute: function () {
    return provider.value()
  },
}
