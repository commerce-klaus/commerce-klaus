import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { expect, test } from "vite-plus/test"

import { generateCustomAttributesTypes } from "../src/custom-attributes.ts"

function withTempDir(run) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sfcc-ts-custom-attributes-test-"))

  try {
    return run(tempDir)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

test("generateCustomAttributesTypes skips when metadata directory is missing", () => {
  withTempDir((workspaceRoot) => {
    fs.mkdirSync(path.join(workspaceRoot, ".b2c-script-types", "types", "dw"), {
      recursive: true,
    })

    const result = generateCustomAttributesTypes({ workspaceRoot })

    expect(result.written).toBe(false)
    expect(result.declarationsCount).toBe(0)
  })
})

test("generateCustomAttributesTypes reads all site_template/meta xml files and writes declarations", () => {
  withTempDir((workspaceRoot) => {
    const metaDir = path.join(workspaceRoot, "sites", "site_template", "meta")
    const dwDir = path.join(workspaceRoot, ".b2c-script-types", "types", "dw")

    fs.mkdirSync(path.join(dwDir, "catalog"), { recursive: true })
    fs.mkdirSync(path.join(dwDir, "order"), { recursive: true })
    fs.mkdirSync(path.join(dwDir, "object"), { recursive: true })
    fs.mkdirSync(metaDir, { recursive: true })

    fs.writeFileSync(path.join(dwDir, "catalog", "Product.d.ts"), "export {}\n")
    fs.writeFileSync(path.join(dwDir, "order", "Basket.d.ts"), "export {}\n")
    fs.writeFileSync(path.join(dwDir, "object", "CustomObject.d.ts"), "export {}\n")
    fs.writeFileSync(
      path.join(dwDir, "object", "CustomObjectMgr.d.ts"),
      [
        'import CustomObject = require("./CustomObject")',
        'import SeekableIterator = require("../util/SeekableIterator")',
        'import utilMap = require("../util/Map")',
        "",
        "declare class CustomObjectMgr {",
        "  static createCustomObject(type: string, keyValue: string): CustomObject;",
        "  static getAllCustomObjects(type: string): SeekableIterator<CustomObject>;",
        "  static getCustomObject(type: string, keyValue: string): CustomObject | null;",
        "  static queryCustomObject(type: string, queryString: string, ...args: any[]): CustomObject;",
        "  static queryCustomObjects(type: string, queryString: string, sortString: string | null, ...args: any[]): SeekableIterator<CustomObject>;",
        "  static queryCustomObjects(type: string, queryAttributes: utilMap<any, any>, sortString: string | null): SeekableIterator<CustomObject>;",
        "}",
        "",
        "export = CustomObjectMgr",
        "",
      ].join("\n"),
    )

    fs.writeFileSync(
      path.join(metaDir, "system-objecttype-extensions.xml"),
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<metadata xmlns="http://www.demandware.com/xml/impex/metadata/2006-10-31">',
        '  <type-extension type-id="Product">',
        "    <custom-attribute-definitions>",
        '      <attribute-definition attribute-id="foo">',
        "        <type>string</type>",
        "        <mandatory-flag>true</mandatory-flag>",
        "      </attribute-definition>",
        '      <attribute-definition attribute-id="status">',
        "        <type>enum-of-string</type>",
        "        <value-definitions>",
        "          <value-definition><value>enabled</value></value-definition>",
        "          <value-definition><value>disabled</value></value-definition>",
        "        </value-definitions>",
        "        <mandatory-flag>false</mandatory-flag>",
        "      </attribute-definition>",
        '      <attribute-definition attribute-id="weights">',
        "        <type>set-of-double</type>",
        "        <mandatory-flag>false</mandatory-flag>",
        "      </attribute-definition>",
        "    </custom-attribute-definitions>",
        "  </type-extension>",
        '  <type-extension type-id="Basket">',
        "    <custom-attribute-definitions>",
        '      <attribute-definition attribute-id="priority">',
        "        <type>int</type>",
        "        <mandatory-flag>false</mandatory-flag>",
        "      </attribute-definition>",
        '      <attribute-definition attribute-id="modes">',
        "        <type>enum-of-int</type>",
        "        <select-multiple-flag>true</select-multiple-flag>",
        "        <value-definitions>",
        "          <value-definition><value>1</value></value-definition>",
        "          <value-definition><value>2</value></value-definition>",
        "        </value-definitions>",
        "      </attribute-definition>",
        "    </custom-attribute-definitions>",
        "  </type-extension>",
        "</metadata>",
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
        "        <mandatory-flag>false</mandatory-flag>",
        "      </attribute-definition>",
        "    </attribute-definitions>",
        "  </custom-type>",
        "</metadata>",
        "",
      ].join("\n"),
    )

    const result = generateCustomAttributesTypes({ workspaceRoot })

    expect(result.written).toBe(true)
    expect(result.declarationsCount).toBe(3)
    expect(result.attributesCount).toBe(7)

    const generatedContent = fs.readFileSync(result.outputFilePath, "utf8")
    expect(generatedContent).toContain("type SfccEnumValue<TValue>")
    expect(generatedContent).toContain('declare module "dw/catalog/Product"')
    expect(generatedContent).toContain("foo: string")
    expect(generatedContent).toContain('status?: SfccEnumValue<"disabled" | "enabled">')
    expect(generatedContent).toContain("weights?: number[]")
    expect(generatedContent).toContain('declare module "dw/order/Basket"')
    expect(generatedContent).toContain("priority?: number")
    expect(generatedContent).toContain("modes?: SfccEnumValue<1 | 2>[]")
    expect(generatedContent).toContain('declare module "dw/object/CustomObject"')
    expect(generatedContent).toContain("eventCode?: string")
    expect(generatedContent).toContain("interface CustomObjectAdyenNotificationCustomAttributes")
    expect(generatedContent).toContain("interface CustomObjectCustomAttributes")
    expect(generatedContent).toContain("eventCode?: string")

    const customObjectMgrContent = fs.readFileSync(
      path.join(dwDir, "object", "CustomObjectMgr.d.ts"),
      "utf8",
    )
    expect(customObjectMgrContent).toContain(
      'static createCustomObject(type: "AdyenNotification", keyValue: string):',
    )
    expect(customObjectMgrContent).toContain(
      'static getCustomObject(type: "AdyenNotification", keyValue: string):',
    )
  })
})

test("generateCustomAttributesTypes covers all supported SFCC type mappings", () => {
  withTempDir((workspaceRoot) => {
    const metaDir = path.join(workspaceRoot, "sites", "site_template", "meta")
    const dwDir = path.join(workspaceRoot, ".b2c-script-types", "types", "dw")

    fs.mkdirSync(path.join(dwDir, "catalog"), { recursive: true })
    fs.mkdirSync(metaDir, { recursive: true })

    fs.writeFileSync(path.join(dwDir, "catalog", "Product.d.ts"), "export {}\n")

    fs.writeFileSync(
      path.join(metaDir, "all-mappings.xml"),
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<metadata xmlns="http://www.demandware.com/xml/impex/metadata/2006-10-31">',
        '  <type-extension type-id="Product">',
        "    <custom-attribute-definitions>",
        '      <attribute-definition attribute-id="attrBoolean"><type>boolean</type></attribute-definition>',
        '      <attribute-definition attribute-id="attrDate"><type>date</type></attribute-definition>',
        '      <attribute-definition attribute-id="attrDateTime"><type>datetime</type></attribute-definition>',
        '      <attribute-definition attribute-id="attrDouble"><type>double</type></attribute-definition>',
        '      <attribute-definition attribute-id="attrEmail"><type>email</type></attribute-definition>',
        '      <attribute-definition attribute-id="attrHtml"><type>html</type></attribute-definition>',
        '      <attribute-definition attribute-id="attrInt"><type>int</type></attribute-definition>',
        '      <attribute-definition attribute-id="attrInteger"><type>integer</type></attribute-definition>',
        '      <attribute-definition attribute-id="attrLong"><type>long</type></attribute-definition>',
        '      <attribute-definition attribute-id="attrNumber"><type>number</type></attribute-definition>',
        '      <attribute-definition attribute-id="attrPassword"><type>password</type></attribute-definition>',
        '      <attribute-definition attribute-id="attrQuantity"><type>quantity</type></attribute-definition>',
        '      <attribute-definition attribute-id="attrString"><type>string</type></attribute-definition>',
        '      <attribute-definition attribute-id="attrText"><type>text</type></attribute-definition>',
        '      <attribute-definition attribute-id="attrUrl"><type>url</type></attribute-definition>',
        '      <attribute-definition attribute-id="attrUnknown"><type>xml</type></attribute-definition>',
        "",
        '      <attribute-definition attribute-id="attrEnumStringWithValues">',
        "        <type>enum-of-string</type>",
        "        <value-definitions>",
        "          <value-definition><value>a</value></value-definition>",
        "          <value-definition><value>b</value></value-definition>",
        "        </value-definitions>",
        "      </attribute-definition>",
        '      <attribute-definition attribute-id="attrEnumStringNoValues"><type>enum-of-string</type></attribute-definition>',
        '      <attribute-definition attribute-id="attrEnumIntWithValues">',
        "        <type>enum-of-int</type>",
        "        <value-definitions>",
        "          <value-definition><value>1</value></value-definition>",
        "          <value-definition><value>2</value></value-definition>",
        "        </value-definitions>",
        "      </attribute-definition>",
        '      <attribute-definition attribute-id="attrEnumIntNoValues"><type>enum-of-int</type></attribute-definition>',
        '      <attribute-definition attribute-id="attrEnumUnknown"><type>enum-of-foo</type></attribute-definition>',
        "",
        '      <attribute-definition attribute-id="attrSetString"><type>set-of-string</type></attribute-definition>',
        '      <attribute-definition attribute-id="attrSetInt"><type>set-of-int</type></attribute-definition>',
        '      <attribute-definition attribute-id="attrSetDouble"><type>set-of-double</type></attribute-definition>',
        '      <attribute-definition attribute-id="attrEnumStringMulti">',
        "        <type>enum-of-string</type>",
        "        <select-multiple-flag>true</select-multiple-flag>",
        "        <value-definitions>",
        "          <value-definition><value>x</value></value-definition>",
        "          <value-definition><value>y</value></value-definition>",
        "        </value-definitions>",
        "      </attribute-definition>",
        '      <attribute-definition attribute-id="attrEnumIntMulti">',
        "        <type>enum-of-int</type>",
        "        <select-multiple-flag>true</select-multiple-flag>",
        "        <value-definitions>",
        "          <value-definition><value>7</value></value-definition>",
        "          <value-definition><value>8</value></value-definition>",
        "        </value-definitions>",
        "      </attribute-definition>",
        '      <attribute-definition attribute-id="attrEnumUnknownMulti">',
        "        <type>enum-of-foo</type>",
        "        <select-multiple-flag>true</select-multiple-flag>",
        "      </attribute-definition>",
        '      <attribute-definition attribute-id="attrInvalidSetEnum"><type>set-of-enum-of-int</type></attribute-definition>',
        '      <attribute-definition attribute-id="attrSetUnknown"><type>set-of-bar</type></attribute-definition>',
        "    </custom-attribute-definitions>",
        "  </type-extension>",
        "</metadata>",
        "",
      ].join("\n"),
    )

    const result = generateCustomAttributesTypes({ workspaceRoot })

    expect(result.written).toBe(true)
    expect(result.declarationsCount).toBe(1)

    const generatedContent = fs.readFileSync(result.outputFilePath, "utf8")

    expect(generatedContent).toContain("attrBoolean?: boolean")
    expect(generatedContent).toContain("attrDate?: Date")
    expect(generatedContent).toContain("attrDateTime?: Date")
    expect(generatedContent).toContain("attrDouble?: number")
    expect(generatedContent).toContain("attrEmail?: string")
    expect(generatedContent).toContain("attrHtml?: string")
    expect(generatedContent).toContain("attrInt?: number")
    expect(generatedContent).toContain("attrInteger?: number")
    expect(generatedContent).toContain("attrLong?: number")
    expect(generatedContent).toContain("attrNumber?: number")
    expect(generatedContent).toContain("attrPassword?: string")
    expect(generatedContent).toContain("attrQuantity?: number")
    expect(generatedContent).toContain("attrString?: string")
    expect(generatedContent).toContain("attrText?: string")
    expect(generatedContent).toContain("attrUrl?: string")
    expect(generatedContent).toContain("attrUnknown?: unknown")

    expect(generatedContent).toContain('attrEnumStringWithValues?: SfccEnumValue<"a" | "b">')
    expect(generatedContent).toContain("attrEnumStringNoValues?: SfccEnumValue<string>")
    expect(generatedContent).toContain("attrEnumIntWithValues?: SfccEnumValue<1 | 2>")
    expect(generatedContent).toContain("attrEnumIntNoValues?: SfccEnumValue<number>")
    expect(generatedContent).toContain("attrEnumUnknown?: SfccEnumValue<string | number>")

    expect(generatedContent).toContain("attrSetString?: string[]")
    expect(generatedContent).toContain("attrSetInt?: number[]")
    expect(generatedContent).toContain("attrSetDouble?: number[]")
    expect(generatedContent).toContain('attrEnumStringMulti?: SfccEnumValue<"x" | "y">[]')
    expect(generatedContent).toContain("attrEnumIntMulti?: SfccEnumValue<7 | 8>[]")
    expect(generatedContent).toContain("attrEnumUnknownMulti?: SfccEnumValue<string | number>[]")
    expect(generatedContent).toContain("attrInvalidSetEnum?: unknown[]")
    expect(generatedContent).toContain("attrSetUnknown?: unknown[]")
  })
})

test("generateCustomAttributesTypes adds typed SystemObjectMgr declarations for supported system objects", () => {
  withTempDir((workspaceRoot) => {
    const metaDir = path.join(workspaceRoot, "sites", "site_template", "meta")
    const dwDir = path.join(workspaceRoot, ".b2c-script-types", "types", "dw")

    fs.mkdirSync(path.join(dwDir, "catalog"), { recursive: true })
    fs.mkdirSync(path.join(dwDir, "object"), { recursive: true })
    fs.mkdirSync(path.join(metaDir), { recursive: true })

    fs.writeFileSync(path.join(dwDir, "catalog", "Store.d.ts"), "export {}\n")
    fs.writeFileSync(
      path.join(dwDir, "object", "SystemObjectMgr.d.ts"),
      [
        'import SeekableIterator = require("../util/SeekableIterator")',
        'import CustomObject = require("./CustomObject")',
        'import utilMap = require("../util/Map")',
        "",
        "declare class SystemObjectMgr {",
        "  private constructor()",
        "  static getAllSystemObjects(type: string): SeekableIterator<CustomObject>",
        "  static querySystemObject(type: string, queryString: string, ...args: any[]): CustomObject",
        "  static querySystemObjects(type: string, queryString: string, sortString: string | null, ...args: any[]): SeekableIterator<CustomObject>",
        "  static querySystemObjects(type: string, queryAttributes: utilMap<any, any>, sortString: string | null): SeekableIterator<CustomObject>",
        "}",
        "",
        "export = SystemObjectMgr",
        "",
      ].join("\n"),
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

    const result = generateCustomAttributesTypes({ workspaceRoot })

    expect(result.written).toBe(true)
    expect(result.declarationsCount).toBe(1)
    expect(result.attributesCount).toBe(1)

    const generatedContent = fs.readFileSync(result.outputFilePath, "utf8")
    expect(generatedContent).toContain('declare module "dw/catalog/Store"')

    const systemObjectMgrContent = fs.readFileSync(
      path.join(dwDir, "object", "SystemObjectMgr.d.ts"),
      "utf8",
    )
    expect(systemObjectMgrContent).toContain(
      'static getAllSystemObjects(type: "Store"): SeekableIterator<Store>',
    )
    expect(systemObjectMgrContent).toContain(
      'static querySystemObject(type: "Store", queryString: string, ...args: any[]): Store',
    )
    expect(systemObjectMgrContent).toContain(
      'static querySystemObjects(type: "Store", queryString: string, sortString: string | null, ...args: any[]): SeekableIterator<Store>',
    )
  })
})

test("generateCustomAttributesTypes prefers explicit system object module mappings when basenames collide", () => {
  withTempDir((workspaceRoot) => {
    const metaDir = path.join(workspaceRoot, "sites", "site_template", "meta")
    const dwDir = path.join(workspaceRoot, ".b2c-script-types", "types", "dw")

    fs.mkdirSync(path.join(dwDir, "catalog"), { recursive: true })
    fs.mkdirSync(path.join(dwDir, "content"), { recursive: true })
    fs.mkdirSync(metaDir, { recursive: true })

    fs.writeFileSync(path.join(dwDir, "catalog", "Product.d.ts"), "export {}\n")
    fs.writeFileSync(path.join(dwDir, "content", "Product.d.ts"), "export {}\n")

    fs.writeFileSync(
      path.join(metaDir, "product.xml"),
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<metadata xmlns="http://www.demandware.com/xml/impex/metadata/2006-10-31">',
        '  <type-extension type-id="Product">',
        "    <custom-attribute-definitions>",
        '      <attribute-definition attribute-id="foo"><type>string</type></attribute-definition>',
        "    </custom-attribute-definitions>",
        "  </type-extension>",
        "</metadata>",
        "",
      ].join("\n"),
    )

    const result = generateCustomAttributesTypes({ workspaceRoot })

    expect(result.written).toBe(true)
    const generatedContent = fs.readFileSync(result.outputFilePath, "utf8")
    expect(generatedContent).toContain('declare module "dw/catalog/Product"')
    expect(generatedContent).not.toContain('declare module "dw/content/Product"')
  })
})

test("generateCustomAttributesTypes skips ambiguous unmapped system object types", () => {
  withTempDir((workspaceRoot) => {
    const metaDir = path.join(workspaceRoot, "sites", "site_template", "meta")
    const dwDir = path.join(workspaceRoot, ".b2c-script-types", "types", "dw")

    fs.mkdirSync(path.join(dwDir, "catalog"), { recursive: true })
    fs.mkdirSync(path.join(dwDir, "content"), { recursive: true })
    fs.mkdirSync(metaDir, { recursive: true })

    fs.writeFileSync(path.join(dwDir, "catalog", "FooThing.d.ts"), "export {}\n")
    fs.writeFileSync(path.join(dwDir, "content", "FooThing.d.ts"), "export {}\n")

    fs.writeFileSync(
      path.join(metaDir, "foo-thing.xml"),
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<metadata xmlns="http://www.demandware.com/xml/impex/metadata/2006-10-31">',
        '  <type-extension type-id="FooThing">',
        "    <custom-attribute-definitions>",
        '      <attribute-definition attribute-id="foo"><type>string</type></attribute-definition>',
        "    </custom-attribute-definitions>",
        "  </type-extension>",
        "</metadata>",
        "",
      ].join("\n"),
    )

    const result = generateCustomAttributesTypes({ workspaceRoot })

    expect(result.written).toBe(false)
  })
})

test("generateCustomAttributesTypes resolves newly mapped order, service, and campaign object types", () => {
  withTempDir((workspaceRoot) => {
    const metaDir = path.join(workspaceRoot, "sites", "site_template", "meta")
    const dwDir = path.join(workspaceRoot, ".b2c-script-types", "types", "dw")

    fs.mkdirSync(path.join(dwDir, "order"), { recursive: true })
    fs.mkdirSync(path.join(dwDir, "svc"), { recursive: true })
    fs.mkdirSync(path.join(dwDir, "campaign"), { recursive: true })
    fs.mkdirSync(metaDir, { recursive: true })

    fs.writeFileSync(path.join(dwDir, "order", "Return.d.ts"), "export {}\n")
    fs.writeFileSync(path.join(dwDir, "svc", "ServiceConfig.d.ts"), "export {}\n")
    fs.writeFileSync(path.join(dwDir, "campaign", "SlotContent.d.ts"), "export {}\n")

    fs.writeFileSync(
      path.join(metaDir, "extra-types.xml"),
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<metadata xmlns="http://www.demandware.com/xml/impex/metadata/2006-10-31">',
        '  <type-extension type-id="Return">',
        "    <custom-attribute-definitions>",
        '      <attribute-definition attribute-id="returnFlag"><type>boolean</type></attribute-definition>',
        "    </custom-attribute-definitions>",
        "  </type-extension>",
        '  <type-extension type-id="ServiceConfig">',
        "    <custom-attribute-definitions>",
        '      <attribute-definition attribute-id="serviceTag"><type>string</type></attribute-definition>',
        "    </custom-attribute-definitions>",
        "  </type-extension>",
        '  <type-extension type-id="SlotConfiguration">',
        "    <custom-attribute-definitions>",
        '      <attribute-definition attribute-id="slotTheme"><type>string</type></attribute-definition>',
        "    </custom-attribute-definitions>",
        "  </type-extension>",
        "</metadata>",
        "",
      ].join("\n"),
    )

    const result = generateCustomAttributesTypes({ workspaceRoot })

    expect(result.written).toBe(true)

    const generatedContent = fs.readFileSync(result.outputFilePath, "utf8")
    expect(generatedContent).toContain('declare module "dw/order/Return"')
    expect(generatedContent).toContain("returnFlag?: boolean")
    expect(generatedContent).toContain('declare module "dw/svc/ServiceConfig"')
    expect(generatedContent).toContain("serviceTag?: string")
    expect(generatedContent).toContain('declare module "dw/campaign/SlotContent"')
    expect(generatedContent).toContain("slotTheme?: string")
  })
})
