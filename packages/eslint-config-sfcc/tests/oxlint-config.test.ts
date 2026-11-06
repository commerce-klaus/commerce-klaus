import { expect, test } from "vite-plus/test"

import {
  createOxlintRecommendedOverride,
  oxlintEsRules,
  oxlintRules,
} from "../src/configs/oxlint.js"

test("creates a scoped recommended JavaScript override", () => {
  expect(createOxlintRecommendedOverride({ cartridgesDir: "custom-cartridges" })).toEqual({
    files: ["custom-cartridges/**/*.{js,ds}"],
    excludeFiles: [
      "custom-cartridges/*/cartridge/client/**",
      "custom-cartridges/*/cartridge/static/**",
    ],
    rules: { ...oxlintEsRules, ...oxlintRules },
  })
})

test("supports explicit file and ignore globs", () => {
  expect(
    createOxlintRecommendedOverride({
      files: ["server/**/*.js"],
      ignores: ["server/generated/**"],
    }),
  ).toEqual({
    files: ["server/**/*.js"],
    excludeFiles: ["server/generated/**"],
    rules: { ...oxlintEsRules, ...oxlintRules },
  })
})
