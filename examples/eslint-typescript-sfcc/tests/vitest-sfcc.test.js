import { resetSfccRuntime } from "@commerce-klaus/vitest-sfcc/runtime"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createPriceLabel } from "../cartridges/app_custom/cartridge/scripts/price-label.js"

describe("vitest-sfcc", () => {
  it("resolves module.superModule using the cartridge order", () => {
    expect(createPriceLabel(19.95)).toBe("$19.95 incl. VAT")
  })

  describe("runtime", () => {
    beforeEach(() => {
      vi.resetModules()
      resetSfccRuntime({
        site: {
          id: "Example",
          preferences: { reviewsEnabled: true },
        },
      })
    })

    afterEach(() => {
      vi.resetModules()
      resetSfccRuntime()
    })

    it("provides the current site to cartridge code", async () => {
      const { getSiteContext } =
        await import("../cartridges/app_custom/cartridge/scripts/site-context.js")

      expect(getSiteContext()).toEqual({
        siteId: "Example",
        reviewsEnabled: true,
      })
    })
  })
})
