import { expect, test } from "vite-plus/test"

import { normalizeCartridgesDir } from "../src/configs/normalize-cartridges-dir.js"

test.each([
  ["cartridges", "cartridges"],
  ["sfcc/cartridges///", "sfcc/cartridges"],
  ["///", "/"],
  ["", "/"],
])("normalizes the cartridges directory %j", (cartridgesDir, expected) => {
  expect(normalizeCartridgesDir(cartridgesDir)).toBe(expected)
})

test("handles long trailing slash sequences", () => {
  expect(normalizeCartridgesDir(`cartridges${"/".repeat(100_000)}`)).toBe("cartridges")
})
