export {}

/**
 * @typedef {object} HasEquals
 * @property {(value: string) => boolean} equals
 */

/** @type {string | HasEquals} */
const value =
  Math.random() > 0.5
    ? "abc"
    : {
        equals() {
          return true
        },
      }

value.equals("123")
