const HookMgr = require("dw/system/HookMgr")

module.exports = {
  execute: function (paymentId) {
    if (!HookMgr.hasHook("app.payment.authorize")) {
      return undefined
    }

    return HookMgr.callHook("app.payment.authorize", "authorize", paymentId)
  },
}
