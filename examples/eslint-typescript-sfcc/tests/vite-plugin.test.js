import { describe, expect, it } from "vite-plus/test"

import priceLabel from "../cartridges/app_custom/cartridge/scripts/price-label.js"

describe("vite-plugin-sfcc-modules", () => {
  it("resolves module.superModule using the cartridge order", () => {
    expect(priceLabel.createPriceLabel(19.95)).toBe("$19.95 incl. VAT")
  })
})
