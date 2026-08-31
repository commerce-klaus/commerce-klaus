"use strict"

const currentCartridge = require("~/cartridge/scripts/greeting")
const highestPriority = require("*/cartridge/scripts/greeting")
const namedCartridge = require("app_example/cartridge/scripts/greeting")

/**
 * @param {string} name
 * @returns {{ current: string, highestPriority: string, base: string }}
 */
function createRequireExamples(name) {
  return {
    current: currentCartridge.createGreeting(name),
    highestPriority: highestPriority.createGreeting(name),
    base: namedCartridge.createGreeting(name),
  }
}

exports.createRequireExamples = createRequireExamples
