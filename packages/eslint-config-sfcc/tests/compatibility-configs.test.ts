import { ESLint } from "eslint"
import unicorn from "eslint-plugin-unicorn"
import { describe, expect, test } from "vite-plus/test"

import {
  compatibility21_2,
  compatibility22_7,
  configs,
  createCompatibilityConfig,
  recommended,
} from "../src/index.js"

const currentApiCode = `
  const entries = Object.entries({ value: 1 })
  const values = Object.values({ value: 1 })
  const object = Object.fromEntries(entries)
  const large = 9007199254740992n
  const root = globalThis
  const trimmed = " value ".trimStart().trimEnd()
  module.exports = { values, object, large, root, trimmed }
`

async function lint(config: ESLint.Options["overrideConfig"], code = currentApiCode) {
  const eslint = new ESLint({ overrideConfigFile: true, overrideConfig: config })
  const [result] = await eslint.lintText(code, {
    filePath: "cartridges/app_custom/cartridge/scripts/example.js",
  })

  return result?.messages ?? []
}

describe("compatibility presets", () => {
  test("recommended follows the current Script API", async () => {
    expect(await lint(recommended)).toHaveLength(0)
  })

  test("compatibility-21.2 rejects APIs introduced in 22.7", async () => {
    const messages = await lint([...recommended, ...compatibility21_2])

    expect(messages.map((message) => message.ruleId)).toEqual([
      "es-x/no-object-entries",
      "es-x/no-object-values",
      "es-x/no-object-fromentries",
      "es-x/no-bigint",
      "es-x/no-global-this",
    ])
  })

  test("compatibility-21.2 does not suggest APIs introduced in 22.7", async () => {
    const code = `
      const root = window
      const object = {}
      for (const [key, value] of entries) {
        object[key] = value
      }
      const large = BigInt(9007199254740992)
      module.exports = { root, object, large }
    `
    const currentMessages = await lint(
      [unicorn.configs.recommended, ...recommended, ...compatibility22_7],
      code,
    )
    const legacyMessages = await lint(
      [unicorn.configs.recommended, ...recommended, ...compatibility21_2],
      code,
    )

    expect(currentMessages.map((message) => message.ruleId)).toEqual(
      expect.arrayContaining([
        "unicorn/prefer-global-this",
        "unicorn/prefer-object-from-entries",
        "unicorn/prefer-bigint-literals",
      ]),
    )

    expect(legacyMessages.map((message) => message.ruleId)).not.toEqual(
      expect.arrayContaining([
        "unicorn/prefer-global-this",
        "unicorn/prefer-object-from-entries",
        "unicorn/prefer-bigint-literals",
      ]),
    )
  })

  test("compatibility-22.7 currently matches the recommended API baseline", async () => {
    expect(await lint([...recommended, ...compatibility22_7])).toHaveLength(0)
  })

  test("exports named presets and the compatibility factory", () => {
    expect(configs["compatibility-21.2"]).toBe(compatibility21_2)
    expect(configs["compatibility-22.7"]).toBe(compatibility22_7)
    expect(createCompatibilityConfig("21.2")).toEqual(compatibility21_2)
    expect(createCompatibilityConfig("22.7")).toEqual(compatibility22_7)
  })

  test("supports custom cartridge paths and file globs", () => {
    expect(
      createCompatibilityConfig("21.2", { cartridgesDir: "commerce/cartridges/" })[0],
    ).toMatchObject({
      files: ["commerce/cartridges/**/*.{js,ds}"],
      ignores: [
        "commerce/cartridges/*/cartridge/client/**",
        "commerce/cartridges/*/cartridge/static/**",
      ],
    })
    expect(
      createCompatibilityConfig("21.2", { files: ["legacy/**/*.js"], ignores: [] })[0],
    ).toMatchObject({
      files: ["legacy/**/*.js"],
      ignores: [],
    })
  })
})
