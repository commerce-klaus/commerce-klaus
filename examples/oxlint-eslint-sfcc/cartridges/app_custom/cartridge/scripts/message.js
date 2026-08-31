"use strict"

// @ts-ignore -- SFCC provides module.superModule at runtime.
const base = module.superModule

/**
 * @param {string} name
 * @returns {string}
 */
function createMessage(name) {
  return `${base.createMessage(name)} Welcome back.`
}

exports.createMessage = createMessage
