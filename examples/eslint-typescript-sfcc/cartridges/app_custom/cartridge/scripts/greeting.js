"use strict"

// Ignore only because of the Vite+ environment.
// @ts-ignore -- `module.superModule` is provided by SFCC and resolved by typescript-sfcc.
const baseGreeting = module.superModule

/**
 * @param {string} name
 * @returns {string}
 */
function createGreeting(name) {
  return `${baseGreeting.createGreeting(name)} This message comes from app_custom.`
}

exports.createGreeting = createGreeting
