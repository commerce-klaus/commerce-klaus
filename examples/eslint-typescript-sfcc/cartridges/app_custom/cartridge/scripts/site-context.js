"use strict"

const Site = require("dw/system/Site")

function getSiteContext() {
  const currentSite = Site.getCurrent()

  return {
    siteId: currentSite.ID,
    reviewsEnabled: currentSite.getCustomPreferenceValue("reviewsEnabled") === true,
  }
}

exports.getSiteContext = getSiteContext
