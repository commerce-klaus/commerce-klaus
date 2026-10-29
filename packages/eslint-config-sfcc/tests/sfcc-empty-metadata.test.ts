import tsParser from "@typescript-eslint/parser"
import { ESLint } from "eslint"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { expect, test } from "vite-plus/test"

import sfcc from "../src/plugins/sfcc/index.js"
import { applySuggestion } from "./test-utils.js"

const METADATA_HEADER = [
  '<metadata xmlns="http://www.demandware.com/xml/impex/metadata/2006-10-31">',
  '  <type-extension type-id="SitePreferences">',
  "    <custom-attribute-definitions>",
  '      <attribute-definition attribute-id="headline"><type>string</type></attribute-definition>',
  '      <attribute-definition attribute-id="threshold"><type>double</type></attribute-definition>',
  "    </custom-attribute-definitions>",
  "  </type-extension>",
  '  <type-extension type-id="Product">',
  "    <custom-attribute-definitions>",
  '      <attribute-definition attribute-id="composition"><type>text</type></attribute-definition>',
  "    </custom-attribute-definitions>",
  "  </type-extension>",
  "</metadata>",
].join("\n")

async function lintWithMetadata(code: string) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "sfcc-empty-metadata-test-"))
  const filename = path.join(cwd, "cartridges", "app_custom", "cartridge", "scripts", "sample.js")
  const metadataPath = path.join(
    cwd,
    "sites",
    "site_template",
    "meta",
    "system-objecttype-extensions.xml",
  )
  const tsconfigPath = path.join(cwd, "tsconfig.json")
  const productTypesPath = path.join(
    cwd,
    ".b2c-script-types",
    "types",
    "dw",
    "catalog",
    "Product.d.ts",
  )

  try {
    fs.mkdirSync(path.dirname(filename), { recursive: true })
    fs.mkdirSync(path.dirname(metadataPath), { recursive: true })
    fs.mkdirSync(path.dirname(productTypesPath), { recursive: true })
    fs.writeFileSync(filename, code)
    fs.writeFileSync(metadataPath, METADATA_HEADER)
    fs.writeFileSync(
      productTypesPath,
      [
        "declare class Product {",
        "  custom: { composition: unknown }",
        "}",
        "export = Product",
      ].join("\n"),
    )
    fs.writeFileSync(
      tsconfigPath,
      JSON.stringify({
        compilerOptions: {
          allowJs: true,
          baseUrl: ".",
          checkJs: true,
          noEmit: true,
          paths: {
            "dw/*": [".b2c-script-types/types/dw/*"],
          },
        },
        include: ["cartridges/**/*.js", ".b2c-script-types/types/**/*.d.ts"],
      }),
    )

    const eslint = new ESLint({
      cwd,
      overrideConfigFile: true,
      overrideConfig: [
        {
          files: ["cartridges/**/*.js"],
          languageOptions: {
            parser: tsParser,
            parserOptions: {
              project: [tsconfigPath],
            },
          },
          plugins: { sfcc },
          rules: {
            "sfcc/no-ambiguous-empty": "error",
            "sfcc/prefer-explicit-empty-check": "error",
          },
          settings: {
            sfcc: {
              siteTemplatePath: "sites/site_template",
            },
          },
        },
      ],
    })

    const [result] = await eslint.lintFiles([filename])
    return { code, messages: result?.messages ?? [] }
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true })
  }
}

function getMessage(result: Awaited<ReturnType<typeof lintWithMetadata>>, ruleId: string) {
  return result.messages.find((message) => message.ruleId === ruleId)
}

test("classifies a static Site preference from metadata", { timeout: 15_000 }, async () => {
  const result = await lintWithMetadata(
    'const Site = require("dw/system/Site")\nempty(Site.current.getCustomPreferenceValue("headline"))',
  )
  const hit = getMessage(result, "sfcc/prefer-explicit-empty-check")

  expect(hit?.message).toContain("SitePreferences.headline metadata (string)")
  expect(hit?.suggestions?.[0]?.desc).toContain(".length === 0")
  expect(getMessage(result, "sfcc/no-ambiguous-empty")).toBeUndefined()
})

test("uses a nullish check for numeric preferences", { timeout: 15_000 }, async () => {
  const result = await lintWithMetadata(
    'const Site = require("dw/system/Site")\nempty(Site.current.getCustomPreferenceValue("threshold"))',
  )
  const hit = getMessage(result, "sfcc/prefer-explicit-empty-check")
  const replacement = applySuggestion(result.code, hit?.suggestions?.[0] as { fix?: any })

  expect(replacement).toContain("=== null")
  expect(replacement).not.toContain(".length")
})

test(
  "classifies a custom attribute only when the receiver type is known",
  { timeout: 15_000 },
  async () => {
    const result = await lintWithMetadata(
      [
        "/** @type {import('dw/catalog/Product')} */",
        "const product = getProduct()",
        "empty(product.custom.composition)",
      ].join("\n"),
    )
    const hit = getMessage(result, "sfcc/prefer-explicit-empty-check")

    expect(hit?.message).toContain("Product.composition metadata (text)")
    expect(hit?.suggestions?.[0]?.desc).toContain(".length === 0")
    expect(getMessage(result, "sfcc/no-ambiguous-empty")).toBeUndefined()
  },
)

test("keeps dynamic preference names ambiguous", { timeout: 15_000 }, async () => {
  const result = await lintWithMetadata(
    [
      'const Site = require("dw/system/Site")',
      "const preferenceName = getPreferenceName()",
      "empty(Site.current.getCustomPreferenceValue(preferenceName))",
    ].join("\n"),
  )

  expect(getMessage(result, "sfcc/no-ambiguous-empty")).toBeDefined()
  expect(getMessage(result, "sfcc/prefer-explicit-empty-check")).toBeUndefined()
})

test("keeps a local Site-shaped adapter ambiguous", { timeout: 15_000 }, async () => {
  const result = await lintWithMetadata(
    'const Site = createSiteAdapter()\nempty(Site.current.getCustomPreferenceValue("headline"))',
  )

  expect(getMessage(result, "sfcc/no-ambiguous-empty")).toBeDefined()
  expect(getMessage(result, "sfcc/prefer-explicit-empty-check")).toBeUndefined()
})

test("keeps custom attributes on unknown receivers ambiguous", { timeout: 15_000 }, async () => {
  const result = await lintWithMetadata("empty(value.custom.composition)")

  expect(getMessage(result, "sfcc/no-ambiguous-empty")).toBeDefined()
  expect(getMessage(result, "sfcc/prefer-explicit-empty-check")).toBeUndefined()
})
