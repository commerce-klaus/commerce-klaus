export {}

const dep: string = process.env.SFCC_MODULE ?? "lodash"
const mod = require(dep)

void mod
