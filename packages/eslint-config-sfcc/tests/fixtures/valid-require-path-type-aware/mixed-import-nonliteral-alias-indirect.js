export {}

/** @typedef {"server" | `dw/${string}`} MixedDep */

/** @type {MixedDep} */
const dep = Math.random() > 0.5 ? "server" : `dw/${process.env.SFCC_MODULE ?? "util/HashMap"}`

function load() {
  return import(dep)
}

void load
