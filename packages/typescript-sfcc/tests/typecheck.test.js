import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { expect, test } from "vite-plus/test"

import { generateCustomAttributesTypes } from "../src/custom-attributes.ts"
import {
  formatDiagnostics,
  parseConfigFile,
  runProjectTypecheck,
  typecheckSolutionProjects,
} from "../src/typecheck.ts"

function withTempDir(run) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sfcc-ts-tooling-typecheck-test-"))

  try {
    return run(tempDir)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

function withEnvUnset(key, run) {
  const previousValue = process.env[key]
  delete process.env[key]

  try {
    return run()
  } finally {
    if (previousValue === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = previousValue
    }
  }
}

function writeJson(filePath, content) {
  fs.writeFileSync(filePath, `${JSON.stringify(content, null, 2)}\n`)
}

test("parseConfigFile parses a valid config and resolves file names", () => {
  withTempDir((tempDir) => {
    const configPath = path.join(tempDir, "jsconfig.json")
    const sourcePath = path.join(tempDir, "index.js")

    fs.writeFileSync(sourcePath, "// @ts-check\n/** @type {number} */\nconst value = 1\n")
    writeJson(configPath, {
      compilerOptions: {
        allowJs: true,
        checkJs: true,
        noEmit: true,
        strict: true,
      },
      include: ["index.js"],
    })

    const parsed = parseConfigFile(configPath, tempDir)

    expect(parsed.fileNames).toContain(sourcePath)
  })
})

test("parseConfigFile reports errors for invalid config JSON", () => {
  withTempDir((tempDir) => {
    const configPath = path.join(tempDir, "jsconfig.json")
    fs.writeFileSync(configPath, "{ invalid json\n")

    const parsed = parseConfigFile(configPath, tempDir)

    expect(parsed.errors.length).toBeGreaterThan(0)
  })
})

test("runProjectTypecheck returns no diagnostics for valid JavaScript with JSDoc", () => {
  withTempDir((tempDir) => {
    const cartridgesDir = path.join(tempDir, "cartridges")
    const appCustom = path.join(cartridgesDir, "app_custom")
    const configPath = path.join(appCustom, "jsconfig.json")
    const sourcePath = path.join(appCustom, "cartridge", "scripts", "ok.js")

    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, "// @ts-check\n/** @type {number} */\nconst count = 1\n")
    writeJson(configPath, {
      compilerOptions: {
        allowJs: true,
        checkJs: true,
        noEmit: true,
        strict: true,
      },
      include: ["cartridge/**/*.js"],
    })

    const diagnostics = runProjectTypecheck(configPath, [appCustom], tempDir)

    expect(diagnostics).toHaveLength(0)
  })
})

test("runProjectTypecheck reports diagnostics for invalid JavaScript with JSDoc", () => {
  withTempDir((tempDir) => {
    const cartridgesDir = path.join(tempDir, "cartridges")
    const appCustom = path.join(cartridgesDir, "app_custom")
    const configPath = path.join(appCustom, "jsconfig.json")
    const sourcePath = path.join(appCustom, "cartridge", "scripts", "broken.js")

    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, '// @ts-check\n/** @type {number} */\nconst count = "bad"\n')
    writeJson(configPath, {
      compilerOptions: {
        allowJs: true,
        checkJs: true,
        noEmit: true,
        strict: true,
      },
      include: ["cartridge/**/*.js"],
    })

    const diagnostics = runProjectTypecheck(configPath, [appCustom], tempDir)

    expect(diagnostics.length).toBeGreaterThan(0)
    expect(diagnostics.some((diagnostic) => diagnostic.code === 2322)).toBe(true)
  })
})

test("runProjectTypecheck resolves */ imports without explicit wildcard path mappings", () => {
  withTempDir((tempDir) => {
    const cartridgesDir = path.join(tempDir, "cartridges")
    const appCustom = path.join(cartridgesDir, "app_custom")
    const appBase = path.join(cartridgesDir, "app_base")
    const configPath = path.join(appCustom, "jsconfig.json")
    const sourcePath = path.join(appCustom, "cartridge", "scripts", "entry.js")
    const baseHelperPath = path.join(appBase, "cartridge", "scripts", "helper.js")

    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.mkdirSync(path.dirname(baseHelperPath), { recursive: true })

    fs.writeFileSync(baseHelperPath, "module.exports = { value: 1 }\n")
    fs.writeFileSync(
      sourcePath,
      [
        "// @ts-check",
        'const helper = require("*/cartridge/scripts/helper")',
        "module.exports = helper",
        "",
      ].join("\n"),
    )

    writeJson(configPath, {
      compilerOptions: {
        allowJs: true,
        checkJs: true,
        noEmit: true,
        strict: true,
      },
      include: ["cartridge/**/*.js"],
    })

    const diagnostics = runProjectTypecheck(configPath, [appCustom, appBase], tempDir)

    expect(diagnostics).toHaveLength(0)
  })
})

test("runProjectTypecheck resolves typed SystemObjectMgr results", () => {
  withTempDir((tempDir) => {
    const cartridgesDir = path.join(tempDir, "cartridges")
    const appCustom = path.join(cartridgesDir, "app_custom")
    const configPath = path.join(appCustom, "jsconfig.json")
    const sourcePath = path.join(appCustom, "cartridge", "scripts", "system-object-mgr.js")
    const metaDir = path.join(tempDir, "sites", "site_template", "meta")
    const dwDir = path.join(tempDir, ".b2c-script-types", "types", "dw")

    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.mkdirSync(path.join(dwDir, "catalog"), { recursive: true })
    fs.mkdirSync(path.join(dwDir, "object"), { recursive: true })
    fs.mkdirSync(path.join(dwDir, "util"), { recursive: true })
    fs.mkdirSync(metaDir, { recursive: true })

    fs.writeFileSync(
      sourcePath,
      [
        "// @ts-check",
        'const SystemObjectMgr = require("dw/object/SystemObjectMgr")',
        'const store = SystemObjectMgr.querySystemObject("Store", "ID = {0}", "store-1")',
        "store.posEnabled",
        'const fromIterator = SystemObjectMgr.getAllSystemObjects("Store").first()',
        "if (fromIterator) {",
        "  fromIterator.posEnabled",
        "}",
        "",
      ].join("\n"),
    )

    fs.writeFileSync(
      path.join(dwDir, "object", "PersistentObject.d.ts"),
      ["declare class PersistentObject {}", "export = PersistentObject", ""].join("\n"),
    )

    fs.writeFileSync(
      path.join(dwDir, "util", "SeekableIterator.d.ts"),
      [
        "declare class SeekableIterator<T> {",
        "  first(): T | null",
        "}",
        "export = SeekableIterator",
        "",
      ].join("\n"),
    )

    fs.writeFileSync(
      path.join(dwDir, "util", "Map.d.ts"),
      ["declare class Map<TKey, TValue> {}", "export = Map", ""].join("\n"),
    )

    fs.writeFileSync(
      path.join(dwDir, "catalog", "Store.d.ts"),
      ["declare class Store {", "  readonly posEnabled: boolean", "}", "export = Store", ""].join(
        "\n",
      ),
    )

    fs.writeFileSync(
      path.join(metaDir, "store.xml"),
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<metadata xmlns="http://www.demandware.com/xml/impex/metadata/2006-10-31">',
        '  <type-extension type-id="Store">',
        "    <custom-attribute-definitions>",
        '      <attribute-definition attribute-id="storeFlag">',
        "        <type>boolean</type>",
        "      </attribute-definition>",
        "    </custom-attribute-definitions>",
        "  </type-extension>",
        "</metadata>",
        "",
      ].join("\n"),
    )

    fs.writeFileSync(
      path.join(dwDir, "object", "SystemObjectMgr.d.ts"),
      [
        'import SeekableIterator = require("../util/SeekableIterator")',
        'import PersistentObject = require("./PersistentObject")',
        'import utilMap = require("../util/Map")',
        "",
        "declare class SystemObjectMgr {",
        "  static getAllSystemObjects(type: string): SeekableIterator<PersistentObject>",
        "  static querySystemObject(type: string, queryString: string, ...args: any[]): PersistentObject",
        "  static querySystemObjects(type: string, queryString: string, sortString: string | null, ...args: any[]): SeekableIterator<PersistentObject>",
        "  static querySystemObjects(type: string, queryAttributes: utilMap<any, any>, sortString: string | null): SeekableIterator<PersistentObject>",
        "}",
        "",
        "export = SystemObjectMgr",
        "",
      ].join("\n"),
    )

    generateCustomAttributesTypes({ workspaceRoot: tempDir })

    writeJson(configPath, {
      compilerOptions: {
        allowJs: true,
        checkJs: true,
        baseUrl: ".",
        ignoreDeprecations: "6.0",
        noEmit: true,
        strict: true,
      },
      include: ["cartridge/**/*.js"],
    })

    const diagnostics = runProjectTypecheck(configPath, [appCustom], tempDir)

    expect(diagnostics).toHaveLength(0)
  })
})

test("runProjectTypecheck resolves typed CustomObjectMgr results", () => {
  withTempDir((tempDir) => {
    const cartridgesDir = path.join(tempDir, "cartridges")
    const appCustom = path.join(cartridgesDir, "app_custom")
    const configPath = path.join(appCustom, "jsconfig.json")
    const sourcePath = path.join(appCustom, "cartridge", "scripts", "custom-object-mgr.js")
    const metaDir = path.join(tempDir, "sites", "site_template", "meta")
    const dwDir = path.join(tempDir, ".b2c-script-types", "types", "dw")

    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.mkdirSync(path.join(dwDir, "object"), { recursive: true })
    fs.mkdirSync(path.join(dwDir, "util"), { recursive: true })
    fs.mkdirSync(metaDir, { recursive: true })

    fs.writeFileSync(
      sourcePath,
      [
        "// @ts-check",
        'const CustomObjectMgr = require("dw/object/CustomObjectMgr")',
        'const customObject = CustomObjectMgr.getCustomObject("AdyenNotification", "notification-1")',
        "if (customObject) {",
        "  customObject.custom.eventCode",
        "}",
        "",
      ].join("\n"),
    )

    fs.writeFileSync(
      path.join(dwDir, "object", "PersistentObject.d.ts"),
      ["declare class PersistentObject {}", "export = PersistentObject", ""].join("\n"),
    )

    fs.writeFileSync(
      path.join(dwDir, "object", "CustomAttributes.d.ts"),
      ["declare class CustomAttributes {}", "export = CustomAttributes", ""].join("\n"),
    )

    fs.writeFileSync(
      path.join(dwDir, "object", "ObjectTypeDefinition.d.ts"),
      ["declare class ObjectTypeDefinition {}", "export = ObjectTypeDefinition", ""].join("\n"),
    )

    fs.writeFileSync(
      path.join(dwDir, "object", "ExtensibleObject.d.ts"),
      [
        'import PersistentObject = require("./PersistentObject")',
        'import CustomAttributes = require("./CustomAttributes")',
        'import ObjectTypeDefinition = require("./ObjectTypeDefinition")',
        "",
        "declare class ExtensibleObject<T extends CustomAttributes> extends PersistentObject {",
        "  readonly custom: T",
        "  describe(): ObjectTypeDefinition",
        "  getCustom(): T",
        "}",
        "",
        "export = ExtensibleObject",
        "",
      ].join("\n"),
    )

    fs.writeFileSync(
      path.join(dwDir, "object", "CustomObject.d.ts"),
      [
        'import ExtensibleObject = require("./ExtensibleObject")',
        'import CustomAttributes = require("./CustomAttributes")',
        "",
        "declare class CustomObject extends ExtensibleObject<CustomAttributes> {",
        "  readonly type: string",
        "}",
        "",
        "export = CustomObject",
        "",
      ].join("\n"),
    )

    fs.writeFileSync(
      path.join(dwDir, "util", "SeekableIterator.d.ts"),
      [
        "declare class SeekableIterator<T> {",
        "  first(): T | null",
        "}",
        "export = SeekableIterator",
        "",
      ].join("\n"),
    )

    fs.writeFileSync(
      path.join(dwDir, "util", "Map.d.ts"),
      ["declare class Map<TKey, TValue> {}", "export = Map", ""].join("\n"),
    )

    fs.writeFileSync(
      path.join(dwDir, "object", "CustomObjectMgr.d.ts"),
      [
        'import ObjectTypeDefinition = require("./ObjectTypeDefinition")',
        'import CustomObject = require("./CustomObject")',
        'import SeekableIterator = require("../util/SeekableIterator")',
        'import utilMap = require("../util/Map")',
        "",
        "declare class CustomObjectMgr {",
        "  private constructor()",
        '  static createCustomObject(type: "AdyenNotification", keyValue: string): CustomObject & { custom: CustomObjectAdyenNotificationCustomAttributes };',
        "  static createCustomObject(type: string, keyValue: string): CustomObject;",
        "  static createCustomObject(type: string, keyValue: number): CustomObject;",
        "  static describe(type: string): ObjectTypeDefinition;",
        '  static getAllCustomObjects(type: "AdyenNotification"): SeekableIterator<CustomObject & { custom: CustomObjectAdyenNotificationCustomAttributes }>;',
        "  static getAllCustomObjects(type: string): SeekableIterator<CustomObject>;",
        '  static getCustomObject(type: "AdyenNotification", keyValue: string): CustomObject & { custom: CustomObjectAdyenNotificationCustomAttributes } | null;',
        "  static getCustomObject(type: string, keyValue: string): CustomObject | null;",
        "  static getCustomObject(type: string, keyValue: number): CustomObject | null;",
        '  static queryCustomObject(type: "AdyenNotification", queryString: string, ...args: any[]): CustomObject & { custom: CustomObjectAdyenNotificationCustomAttributes };',
        "  static queryCustomObject(type: string, queryString: string, ...args: any[]): CustomObject;",
        '  static queryCustomObjects(type: "AdyenNotification", queryString: string, sortString: string | null, ...args: any[]): SeekableIterator<CustomObject & { custom: CustomObjectAdyenNotificationCustomAttributes }>;',
        '  static queryCustomObjects(type: "AdyenNotification", queryAttributes: utilMap<any, any>, sortString: string | null): SeekableIterator<CustomObject & { custom: CustomObjectAdyenNotificationCustomAttributes }>;',
        "  static queryCustomObjects(type: string, queryString: string, sortString: string | null, ...args: any[]): SeekableIterator<CustomObject>;",
        "  static queryCustomObjects(type: string, queryAttributes: utilMap<any, any>, sortString: string | null): SeekableIterator<CustomObject>;",
        "}",
        "",
        "export = CustomObjectMgr",
        "",
      ].join("\n"),
    )

    fs.writeFileSync(
      path.join(metaDir, "custom-objecttype-definitions.xml"),
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<metadata xmlns="http://www.demandware.com/xml/impex/metadata/2006-10-31">',
        '  <custom-type type-id="AdyenNotification">',
        "    <attribute-definitions>",
        '      <attribute-definition attribute-id="eventCode">',
        "        <type>string</type>",
        "      </attribute-definition>",
        "    </attribute-definitions>",
        "  </custom-type>",
        "</metadata>",
        "",
      ].join("\n"),
    )

    generateCustomAttributesTypes({ workspaceRoot: tempDir })

    writeJson(configPath, {
      compilerOptions: {
        allowJs: true,
        checkJs: true,
        baseUrl: ".",
        ignoreDeprecations: "6.0",
        noEmit: true,
        strict: true,
      },
      include: ["cartridge/**/*.js"],
    })

    const diagnostics = runProjectTypecheck(configPath, [appCustom], tempDir)

    expect(diagnostics).toHaveLength(0)
  })
})

test("typecheckSolutionProjects typechecks all references from solution config", () => {
  withTempDir((tempDir) => {
    withEnvUnset("SFCC_CARTRIDGE_PATH", () => {
      const cartridgesDir = path.join(tempDir, "cartridges")
      const solutionConfigPath = path.join(cartridgesDir, "jsconfig.json")
      const appBase = path.join(cartridgesDir, "app_base")
      const appCustom = path.join(cartridgesDir, "app_custom")

      const baseSource = path.join(appBase, "cartridge", "scripts", "ok.js")
      const customSource = path.join(appCustom, "cartridge", "scripts", "broken.js")
      const appBaseConfigPath = path.join(appBase, "jsconfig.json")
      const appCustomConfigPath = path.join(appCustom, "jsconfig.json")

      fs.mkdirSync(path.dirname(baseSource), { recursive: true })
      fs.mkdirSync(path.dirname(customSource), { recursive: true })

      fs.writeFileSync(baseSource, "// @ts-check\n/** @type {number} */\nconst base = 1\n")
      fs.writeFileSync(customSource, '// @ts-check\n/** @type {number} */\nconst custom = "bad"\n')

      writeJson(solutionConfigPath, {
        references: [{ path: "./app_base" }, { path: "./app_custom" }],
      })
      writeJson(appBaseConfigPath, {
        compilerOptions: {
          allowJs: true,
          checkJs: true,
          noEmit: true,
          strict: true,
        },
        include: ["cartridge/**/*.js"],
      })
      writeJson(appCustomConfigPath, {
        compilerOptions: {
          allowJs: true,
          checkJs: true,
          noEmit: true,
          strict: true,
        },
        include: ["cartridge/**/*.js"],
      })

      const diagnostics = typecheckSolutionProjects({
        solutionConfigPath,
        cartridgesDir,
      })

      expect(diagnostics.length).toBeGreaterThan(0)
      expect(
        diagnostics.some(
          (diagnostic) =>
            diagnostic.file?.fileName && diagnostic.file.fileName.endsWith("broken.js"),
        ),
      ).toBe(true)
    })
  })
})

test("formatDiagnostics returns human-readable output", () => {
  withTempDir((tempDir) => {
    const cartridgesDir = path.join(tempDir, "cartridges")
    const appCustom = path.join(cartridgesDir, "app_custom")
    const configPath = path.join(appCustom, "jsconfig.json")
    const sourcePath = path.join(appCustom, "cartridge", "scripts", "broken.js")

    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, '// @ts-check\n/** @type {number} */\nconst count = "bad"\n')
    writeJson(configPath, {
      compilerOptions: {
        allowJs: true,
        checkJs: true,
        noEmit: true,
        strict: true,
      },
      include: ["cartridge/**/*.js"],
    })

    const diagnostics = runProjectTypecheck(configPath, [appCustom], tempDir)
    const output = formatDiagnostics([...diagnostics], tempDir)

    expect(output).toContain("broken.js")
    expect(output).toContain("TS2322")
  })
})

test("runProjectTypecheck reports diagnostics for JSDoc @param mismatch", () => {
  withTempDir((tempDir) => {
    const cartridgesDir = path.join(tempDir, "cartridges")
    const appCustom = path.join(cartridgesDir, "app_custom")
    const configPath = path.join(appCustom, "jsconfig.json")
    const sourcePath = path.join(appCustom, "cartridge", "scripts", "param-mismatch.js")

    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(
      sourcePath,
      [
        "// @ts-check",
        "/** @param {number} amount */",
        "function double(amount) {",
        "  return amount * 2",
        "}",
        'double("2")',
        "",
      ].join("\n"),
    )
    writeJson(configPath, {
      compilerOptions: {
        allowJs: true,
        checkJs: true,
        noEmit: true,
        strict: true,
      },
      include: ["cartridge/**/*.js"],
    })

    const diagnostics = runProjectTypecheck(configPath, [appCustom], tempDir)

    expect(diagnostics.length).toBeGreaterThan(0)
    expect(diagnostics.some((diagnostic) => diagnostic.code === 2345)).toBe(true)
  })
})

test("runProjectTypecheck reports diagnostics for JSDoc @typedef object mismatch", () => {
  withTempDir((tempDir) => {
    const cartridgesDir = path.join(tempDir, "cartridges")
    const appCustom = path.join(cartridgesDir, "app_custom")
    const configPath = path.join(appCustom, "jsconfig.json")
    const sourcePath = path.join(appCustom, "cartridge", "scripts", "typedef-mismatch.js")

    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(
      sourcePath,
      [
        "// @ts-check",
        "/**",
        " * @typedef {{ id: number, name: string }} Product",
        " */",
        "",
        "/** @type {Product} */",
        "const product = { id: 1, name: 42 }",
        "",
      ].join("\n"),
    )
    writeJson(configPath, {
      compilerOptions: {
        allowJs: true,
        checkJs: true,
        noEmit: true,
        strict: true,
      },
      include: ["cartridge/**/*.js"],
    })

    const diagnostics = runProjectTypecheck(configPath, [appCustom], tempDir)

    expect(diagnostics.length).toBeGreaterThan(0)
    expect(diagnostics.some((diagnostic) => diagnostic.code === 2322)).toBe(true)
  })
})

test("runProjectTypecheck loads generated custom attribute typings from b2c-script-types", () => {
  withTempDir((tempDir) => {
    const cartridgesDir = path.join(tempDir, "cartridges")
    const appCustom = path.join(cartridgesDir, "app_custom")
    const configPath = path.join(appCustom, "jsconfig.json")
    const sourcePath = path.join(appCustom, "cartridge", "scripts", "custom-attrs.ts")
    const productTypePath = path.join(
      tempDir,
      ".b2c-script-types",
      "types",
      "dw",
      "catalog",
      "Product.d.ts",
    )
    const productMgrTypePath = path.join(
      tempDir,
      ".b2c-script-types",
      "types",
      "dw",
      "catalog",
      "ProductMgr.d.ts",
    )
    const generatedTypesPath = path.join(
      tempDir,
      ".b2c-script-types",
      "types",
      "sfcc-custom-attributes.generated.d.ts",
    )

    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.mkdirSync(path.dirname(productTypePath), { recursive: true })

    fs.writeFileSync(
      sourcePath,
      [
        'import ProductMgr = require("dw/catalog/ProductMgr")',
        'const product = ProductMgr.getProduct("test")',
        "if (product) {",
        "  product.custom.foo",
        "  product.custom.unknown",
        "}",
        "",
      ].join("\n"),
    )

    fs.writeFileSync(
      productTypePath,
      [
        "declare class Product {",
        "  custom: ProductCustomAttributes",
        "}",
        "interface ProductCustomAttributes {}",
        "export = Product",
        "",
      ].join("\n"),
    )

    fs.writeFileSync(
      productMgrTypePath,
      [
        'import Product = require("./Product")',
        "declare class ProductMgr {",
        "  static getProduct(productId: string): Product | null",
        "}",
        "export = ProductMgr",
        "",
      ].join("\n"),
    )

    fs.writeFileSync(
      generatedTypesPath,
      [
        'declare module "dw/catalog/Product" {',
        "  interface ProductCustomAttributes {",
        "    foo?: string",
        "  }",
        "}",
        "",
      ].join("\n"),
    )

    writeJson(configPath, {
      compilerOptions: {
        baseUrl: ".",
        allowJs: true,
        checkJs: true,
        noEmit: true,
        strict: true,
      },
      include: ["cartridge/**/*.ts"],
    })

    const diagnostics = runProjectTypecheck(configPath, [appCustom], tempDir)

    expect(diagnostics.length).toBeGreaterThan(0)
    expect(diagnostics.some((diagnostic) => diagnostic.code === 2339)).toBe(true)
    // oxlint-disable-next-line typescript/no-base-to-string
    const messages = diagnostics.map((diagnostic) => String(diagnostic.messageText)).join("\n")
    expect(messages).toContain("unknown")
  })
})
