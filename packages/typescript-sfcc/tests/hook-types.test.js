import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { expect, test } from "vite-plus/test"

import { generateHookTypes } from "../src/hook-types.ts"

test("generateHookTypes creates aliases for Salesforce hook interface methods", () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sfcc-ts-hook-types-test-"))
  const declarationPath = path.join(
    workspaceRoot,
    ".b2c-script-types",
    "types",
    "dw",
    "order",
    "hooks",
    "CalculateHooks.d.ts",
  )

  try {
    fs.mkdirSync(path.dirname(declarationPath), { recursive: true })
    fs.writeFileSync(
      declarationPath,
      [
        "declare interface CalculateHooks {",
        '  readonly extensionPointCalculate: "dw.order.calculate"',
        "  calculate(lineItemCtnr: object): void",
        "}",
        "export = CalculateHooks",
        "",
      ].join("\n"),
    )

    const result = generateHookTypes({ workspaceRoot })
    const generatedContent = fs.readFileSync(result.outputFilePath, "utf8")

    expect(result.declarationsCount).toBe(1)
    expect(generatedContent).toContain(
      'import HookInterface0 = require("dw/order/hooks/CalculateHooks")',
    )
    expect(generatedContent).toContain('type OrderCalculate = HookInterface0["calculate"]')
  } finally {
    fs.rmSync(workspaceRoot, { recursive: true, force: true })
  }
})
