export {}

/** @typedef {{ ID: string }} Product */

/** @type {Product | null | undefined} */
const customer = Math.random() > 0.5 ? { ID: "sample" } : null

empty(customer)
