"use strict"

const CustomObjectMgr = require("dw/object/CustomObjectMgr")

/**
 * @param {string} name
 * @returns {string}
 */
function createGreeting(name) {
  return `Hello, ${name}!`
}

/**
 * @param {string} keyValue
 * @returns {string}
 */
function createNotificationMessage(keyValue) {
  const customObject = CustomObjectMgr.getCustomObject("ExampleNotification", keyValue)
  const eventCode = customObject ? customObject.custom.eventCode || "unknown" : "not-found"

  return `${createGreeting("Commerce Klaus")} Event: ${eventCode}`
}

exports.createGreeting = createGreeting
exports.createNotificationMessage = createNotificationMessage
