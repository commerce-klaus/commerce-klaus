export {}

/** @typedef {Record<string, unknown> | { sample: true }} CustomerValue */

/** @type {CustomerValue} */
const customer =
  Math.random() > 0.5 ? { sample: true } : /** @type {Record<string, unknown>} */ ({ other: 1 })

empty(customer)
