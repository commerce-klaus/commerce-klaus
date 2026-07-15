export {}

type AllowedDep = "dw/order/OrderMgr" | "server"

const dep: AllowedDep = Math.random() > 0.5 ? "dw/order/OrderMgr" : "server"
const mod = require(dep)

void mod
