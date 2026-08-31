import { Linter } from "eslint"
import { expect, test } from "vite-plus/test"

import { recommended } from "../src/index.js"
import sfcc from "../src/plugins/sfcc/index.js"

type CollectionPath =
  | "dw/util/ArrayList"
  | "dw/util/HashMap"
  | "dw/util/HashSet"
  | "dw/util/LinkedHashSet"

function lint(code: string, options?: { allow?: CollectionPath[] }) {
  const linter = new Linter()
  return linter.verify(
    code,
    {
      languageOptions: { sourceType: "commonjs" },
      plugins: { sfcc },
      rules: {
        "sfcc/prefer-native-collections": ["error", ...(options ? [options] : [])],
      },
    },
    { filename: "cartridges/app_custom/cartridge/scripts/example.js" },
  )
}

test("reports concrete SFCC collection implementation imports", () => {
  const messages = lint(`
    const ArrayList = require("dw/util/ArrayList")
    const HashMap = require("dw/util/HashMap")
    const HashSet = require("dw/util/HashSet")
    const LinkedHashSet = require("dw/util/LinkedHashSet")
  `)

  expect(messages.map((message) => message.message)).toEqual([
    expect.stringContaining('"Array"'),
    expect.stringContaining('"Map"'),
    expect.stringContaining('"Set"'),
    expect.stringContaining('"Set"'),
  ])
})

test("allows configured SFCC collection imports", () => {
  const messages = lint('const ArrayList = require("dw/util/ArrayList")', {
    allow: ["dw/util/ArrayList"],
  })

  expect(messages).toHaveLength(0)
})

test("supports static templates and ignores interfaces and dynamic imports", () => {
  const messages = lint(`
    const HashSet = require(\`dw/util/HashSet\`)
    const Collection = require("dw/util/Collection")
    const Iterator = require("dw/util/Iterator")
    const dynamicCollection = require(collectionPath)
  `)

  expect(messages).toHaveLength(1)
  expect(messages[0]?.message).toContain('"Set"')
})

test("is not enabled in the recommended config", () => {
  const ruleIds = recommended.flatMap((config) => Object.keys(config.rules ?? {}))

  expect(ruleIds).not.toContain("sfcc/prefer-native-collections")
})
