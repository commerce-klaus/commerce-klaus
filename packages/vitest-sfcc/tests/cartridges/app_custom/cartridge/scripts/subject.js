const Transaction = require("dw/system/Transaction")
const provider = require("*/cartridge/scripts/provider")

module.exports = {
  execute: function () {
    return Transaction.wrap(function () {
      return provider.value()
    })
  },
}
