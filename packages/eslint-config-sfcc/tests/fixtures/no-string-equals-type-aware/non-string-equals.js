export {}

/**
 * @typedef {object} HasEquals
 * @property {(value: string) => boolean} equals
 */

/** @type {HasEquals} */
const value = {
  equals() {
    return true
  },
}

value.equals("123")
