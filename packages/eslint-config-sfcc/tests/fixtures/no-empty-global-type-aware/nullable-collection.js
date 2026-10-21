export {}

/** @typedef {{ isEmpty(): boolean }} Collection */

/** @type {Collection | null | undefined} */
const customer = Math.random() > 0.5 ? { isEmpty: () => true } : null

empty(customer)
