"use strict"

/**
 * @type {SfccHooks.ShopperProductModifyGetResponse}
 */
function modifyGETResponse(document) {
  document.c_brand = "Commerce Klaus"
}

exports.modifyGETResponse = modifyGETResponse
