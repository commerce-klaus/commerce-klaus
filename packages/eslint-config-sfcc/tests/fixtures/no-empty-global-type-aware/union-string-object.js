export {}

/** @typedef {string | Record<string, unknown>} CustomerValue */

const source = Math.random() > 0.5 ? "" : /** @type {Record<string, unknown>} */ ({ sample: true })
/** @type {CustomerValue} */
const customer = source

empty(customer)
