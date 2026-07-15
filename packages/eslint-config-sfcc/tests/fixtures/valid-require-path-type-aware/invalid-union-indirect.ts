export {}

const dep: "dw/order/OrderMgr" | "lodash" = Math.random() > 0.5 ? "dw/order/OrderMgr" : "lodash"
const mod = require(dep)

void mod
