"use strict"

// Ignore only because of the Vite+ environment.
// @ts-ignore -- `module.superModule` is provided by SFCC and transformed by the Vite plugin.
const basePriceLabel = module.superModule

/**
 * @param {number} price
 * @returns {string}
 */
function createPriceLabel(price) {
  return `${basePriceLabel.createPriceLabel(price)} incl. VAT`
}

exports.createPriceLabel = createPriceLabel
