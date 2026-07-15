export {}

type MaybeInvalidDep = "dw/order/OrderMgr" | "lodash"

const dep: MaybeInvalidDep = Math.random() > 0.5 ? "dw/order/OrderMgr" : "lodash"
const mod = require(dep)

void mod
