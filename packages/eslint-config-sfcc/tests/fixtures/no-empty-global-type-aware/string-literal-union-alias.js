export {}

/** @typedef {"" | "abc"} CustomerValue */

/** @type {CustomerValue} */
const customer = Math.random() > 0.5 ? "" : "abc"

empty(customer)
