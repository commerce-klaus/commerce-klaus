import { Linter } from "eslint"
import { expect, test } from "vite-plus/test"

import { recommended } from "../src/index.js"
import sfcc from "../src/plugins/sfcc/index.js"

type PlatformGlobal = "customer" | "request" | "response" | "session"

function lint(code: string, options?: { allow?: PlatformGlobal[] }) {
  const linter = new Linter()
  return linter.verify(
    code,
    {
      languageOptions: {
        globals: {
          customer: "readonly",
          request: "readonly",
          response: "readonly",
          session: "readonly",
        },
      },
      plugins: { sfcc },
      rules: {
        "sfcc/no-platform-globals": ["error", ...(options ? [options] : [])],
      },
    },
    { filename: "cartridges/app_custom/cartridge/scripts/example.js" },
  )
}

test("reports stateful SFCC platform globals by default", () => {
  const messages = lint(
    "customer.authenticated; request.httpMethod; response.status; session.currency",
  )

  expect(messages.map((message) => message.messageId)).toEqual([
    "platformGlobal",
    "platformGlobal",
    "platformGlobal",
    "platformGlobal",
  ])
  expect(messages.map((message) => message.message)).toEqual([
    expect.stringContaining('"customer"'),
    expect.stringContaining('"request"'),
    expect.stringContaining('"response"'),
    expect.stringContaining('"session"'),
  ])
})

test("allows configured platform globals", () => {
  const messages = lint("request.httpMethod; response.status", { allow: ["request"] })

  expect(messages).toHaveLength(1)
  expect(messages[0]?.message).toContain('"response"')
})

test("ignores locally defined identifiers with platform global names", () => {
  const messages = lint(`
    function handle(request, response) {
      const session = request.session
      return { response, session }
    }
  `)

  expect(messages).toHaveLength(0)
})

test("is not enabled in the recommended config", () => {
  const ruleIds = recommended.flatMap((config) => Object.keys(config.rules ?? {}))

  expect(ruleIds).not.toContain("sfcc/no-platform-globals")
})
