export {}

/** @type {string} */
const dep = process.env.SFCC_MODULE ?? "lodash"
const mod = require(dep)

void mod
