import { Linter } from "eslint"
import { expect, test } from "vite-plus/test"

import { configs } from "../src/index.js"
import sfcc from "../src/plugins/sfcc/index.js"

function lint(code: string) {
  return new Linter().verify(code, {
    languageOptions: { sourceType: "commonjs" },
    plugins: { sfcc },
    rules: { "sfcc/no-service-framework": "error" },
  })
}

test.each([
  "require('dw/svc/ServiceRegistry')",
  "require(`dw/svc/LocalServiceRegistry`)",
  "import('dw/svc/HTTPService')",
])("reports Service Framework access through %s", (code) => {
  const messages = lint(code)

  expect(messages).toHaveLength(1)
  expect(messages[0]?.messageId).toBe("serviceFramework")
})

test.each([
  "require('dw/svcs/ServiceRegistry')",
  "require('app_custom/svc/ServiceRegistry')",
  "require(serviceModule)",
  "import(`dw/svc/${serviceName}`)",
])("allows unrelated or dynamic module path %s", (code) => {
  expect(lint(code)).toHaveLength(0)
})

test("is not enabled in recommended or storefront presets", () => {
  const ruleIds = Object.values(configs).flatMap((preset) =>
    preset.flatMap((presetConfig) => Object.keys(presetConfig.rules ?? {})),
  )

  expect(ruleIds).not.toContain("sfcc/no-service-framework")
})
