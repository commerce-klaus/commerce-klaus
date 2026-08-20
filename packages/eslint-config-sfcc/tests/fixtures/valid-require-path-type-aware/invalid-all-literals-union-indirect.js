export {}

/** @typedef {"lodash" | "chalk"} InvalidDep */

/** @type {InvalidDep} */
const dep = Math.random() > 0.5 ? "lodash" : "chalk"
const mod = require(dep)

void mod
