"use strict"

const Logger = require("dw/system/Logger")
const Status = require("dw/system/Status")

/**
 * @type {SfccHooks.OrderCalculate}
 */
function calculate(lineItemCtnr) {
  Logger.debug("Calculating totals for {0}", lineItemCtnr)

  return new Status(Status.OK)
}

exports.calculate = calculate
