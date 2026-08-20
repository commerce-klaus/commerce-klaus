export {}

/** @type {"dw/order/OrderMgr" | "lodash"} */
const dep = Math.random() > 0.5 ? "dw/order/OrderMgr" : "lodash"
const mod = require(dep)

void mod
