export {}

type InvalidDep = "lodash" | "chalk"

const dep: InvalidDep = Math.random() > 0.5 ? "lodash" : "chalk"
const mod = require(dep)

void mod
