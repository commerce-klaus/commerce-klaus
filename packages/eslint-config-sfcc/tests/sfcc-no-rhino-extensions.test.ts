import { Linter } from "eslint"
import { expect, test } from "vite-plus/test"

import { recommended } from "../src/index.js"
import sfcc from "../src/plugins/sfcc/index.js"

type RhinoGlobal =
  | "Iterator"
  | "JavaAdapter"
  | "JavaImporter"
  | "Packages"
  | "StopIteration"
  | "java"
  | "javax"

function lint(code: string, options?: { allow?: RhinoGlobal[] }) {
  const linter = new Linter()
  return linter.verify(
    code,
    {
      plugins: { sfcc },
      rules: {
        "sfcc/no-rhino-extensions": ["error", ...(options ? [options] : [])],
      },
    },
    { filename: "cartridges/app_custom/cartridge/scripts/example.js" },
  )
}

test("reports Rhino and LiveConnect runtime globals", () => {
  const messages = lint(`
    const iterator = Iterator(values)
    const adapter = new JavaAdapter(interfaceType, implementation)
    const importer = new JavaImporter(java.util)
    const list = new Packages.java.util.ArrayList()
    const exception = javax.net.ssl.SSLException
    if (!iterator.hasNext()) throw StopIteration
  `)

  expect(messages.map((message) => message.messageId)).toEqual([
    "rhinoGlobal",
    "rhinoGlobal",
    "rhinoGlobal",
    "rhinoGlobal",
    "rhinoGlobal",
    "rhinoGlobal",
    "rhinoGlobal",
  ])
})

test("allows configured Rhino globals", () => {
  const messages = lint("const list = new Packages.java.util.ArrayList(); Iterator(list)", {
    allow: ["Packages"],
  })

  expect(messages).toHaveLength(1)
  expect(messages[0]?.message).toContain('"Iterator"')
})

test("ignores locally defined identifiers with Rhino global names", () => {
  const messages = lint(`
    function iterate(Iterator, Packages) {
      return Iterator(Packages)
    }
  `)

  expect(messages).toHaveLength(0)
})

test("is not enabled in the recommended config", () => {
  const ruleIds = recommended.flatMap((config) => Object.keys(config.rules ?? {}))

  expect(ruleIds).not.toContain("sfcc/no-rhino-extensions")
})
