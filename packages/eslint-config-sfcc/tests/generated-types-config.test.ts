import { expect, test } from "vite-plus/test"

import { createGeneratedTypesConfig, createOxlintGeneratedTypesOverride } from "../src/index.js"

test("creates an equivalent generated-types override for Oxlint", () => {
  const options = {
    files: ["commerce/**/*.js"],
  }
  const eslintConfig = createGeneratedTypesConfig(options)[0]

  expect(createOxlintGeneratedTypesOverride(options)).toEqual({
    files: eslintConfig?.files,
    rules: eslintConfig?.rules,
  })
})
