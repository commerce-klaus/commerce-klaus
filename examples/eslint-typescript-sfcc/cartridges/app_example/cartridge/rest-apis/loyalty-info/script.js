"use strict"

const RESTResponseMgr = require("dw/system/RESTResponseMgr")

function getLoyaltyInfo() {
  /**
   * @type {SfccCustomApis.Operations["getLoyaltyInfo"]["Response"]}
   */
  const loyaltyInfo = { tier: "silver", points: 14275 }

  return RESTResponseMgr.createSuccess(loyaltyInfo).render()
}

getLoyaltyInfo.public = true
exports.getLoyaltyInfo = getLoyaltyInfo
