"use strict"

/**
 * @param {number} price
 * @returns {string}
 */
function createPriceLabel(price) {
  return `$${price.toFixed(2)}`
}

exports.createPriceLabel = createPriceLabel
