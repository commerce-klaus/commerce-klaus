export {}

/** @typedef {"dw/order/OrderMgr" | "server"} AllowedDep */

/** @type {AllowedDep} */
const dep = Math.random() > 0.5 ? "dw/order/OrderMgr" : "server"
const mod = require(dep)

void mod
