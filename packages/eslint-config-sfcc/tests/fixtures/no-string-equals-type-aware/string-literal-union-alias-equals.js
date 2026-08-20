export {}

/** @typedef {"abc" | "def"} CustomerNo */

/** @type {CustomerNo} */
const value = Math.random() > 0.5 ? "abc" : "def"

value.equals("123")
