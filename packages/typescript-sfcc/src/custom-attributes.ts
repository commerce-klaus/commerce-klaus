import { XMLParser } from "fast-xml-parser"
import {
  existsSync as nodeExistsSync,
  readdirSync as nodeReaddirSync,
  readFileSync as nodeReadFileSync,
  statSync as nodeStatSync,
  writeFileSync as nodeWriteFileSync,
} from "node:fs"
import path from "node:path"

import {
  GENERATED_CUSTOM_ATTRIBUTES_FILE_NAME,
  resolveGeneratedCustomAttributesTypesPath,
  resolveSiteTemplatePath,
} from "./shared.ts"

interface GeneratedAttribute {
  name: string
  typeName: string
  required: boolean
}

type AttributeMap = Map<string, GeneratedAttribute>

export interface GenerateCustomAttributesTypesOptions {
  workspaceRoot: string
  siteTemplatePath?: string
  existsSync?: (filePath: string) => boolean
  readFileSync?: (filePath: string, encoding: BufferEncoding) => string
  readdirSync?: (dirPath: string) => string[]
  statSync?: (filePath: string) => { isDirectory(): boolean }
  writeFileSync?: (filePath: string, content: string, encoding: BufferEncoding) => void
}

export interface GenerateCustomAttributesTypesResult {
  outputFilePath: string
  sourceFiles: string[]
  written: boolean
  declarationsCount: number
  attributesCount: number
}

interface ValueDefinition {
  value?: unknown
}

interface ParsedAttributeDefinition {
  [key: string]: unknown
}

interface ParsedTypeExtension {
  "type-id"?: unknown
  "custom-attribute-definitions"?: {
    "attribute-definition"?: ParsedAttributeDefinition | ParsedAttributeDefinition[]
  }
}

interface ParsedCustomType {
  "type-id"?: unknown
  "attribute-definitions"?: {
    "attribute-definition"?: ParsedAttributeDefinition | ParsedAttributeDefinition[]
  }
}

interface ParsedMetadataRoot {
  metadata?: {
    "type-extension"?: ParsedTypeExtension | ParsedTypeExtension[]
    "custom-type"?: ParsedCustomType | ParsedCustomType[]
  }
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  trimValues: true,
  parseTagValue: false,
  parseAttributeValue: false,
})

const SFCC_TYPE_TO_TYPESCRIPT: Record<string, string> = {
  boolean: "boolean",
  date: "Date",
  datetime: "Date",
  double: "number",
  email: "string",
  html: "string",
  int: "number",
  integer: "number",
  long: "number",
  number: "number",
  password: "string",
  quantity: "number",
  string: "string",
  text: "string",
  url: "string",
}

const DEFAULT_ENUM_VALUE_TYPE = "SfccEnumValue<string | number>"

const SYSTEM_OBJECT_MGR_TYPES = [
  "GiftCertificate",
  "Order",
  "ProductList",
  "Profile",
  "SourceCodeGroup",
  "Store",
] as const

const PREFERRED_SYSTEM_OBJECT_MODULES: Record<string, string> = {
  Appeasement: "dw/order/Appeasement",
  AppeasementItem: "dw/order/AppeasementItem",
  Basket: "dw/order/Basket",
  BonusDiscountLineItem: "dw/order/BonusDiscountLineItem",
  Campaign: "dw/campaign/Campaign",
  Catalog: "dw/catalog/Catalog",
  Category: "dw/catalog/Category",
  CategoryAssignment: "dw/catalog/CategoryAssignment",
  Content: "dw/content/Content",
  Coupon: "dw/campaign/Coupon",
  CouponLineItem: "dw/order/CouponLineItem",
  CustomerActiveData: "dw/customer/CustomerActiveData",
  CustomerAddress: "dw/customer/CustomerAddress",
  CustomerCDPData: "dw/customer/CustomerCDPData",
  CustomerGroup: "dw/customer/CustomerGroup",
  CustomerPaymentInstrument: "dw/customer/CustomerPaymentInstrument",
  Folder: "dw/content/Folder",
  GiftCertificate: "dw/order/GiftCertificate",
  GiftCertificateLineItem: "dw/order/GiftCertificateLineItem",
  Invoice: "dw/order/Invoice",
  InvoiceItem: "dw/order/InvoiceItem",
  Library: "dw/content/Library",
  Order: "dw/order/Order",
  OrderAddress: "dw/order/OrderAddress",
  OrderItem: "dw/order/OrderItem",
  OrderPaymentInstrument: "dw/order/OrderPaymentInstrument",
  OrganizationPreferences: "dw/system/OrganizationPreferences",
  PaymentCard: "dw/order/PaymentCard",
  PaymentMethod: "dw/order/PaymentMethod",
  PaymentTransaction: "dw/order/PaymentTransaction",
  PriceAdjustment: "dw/order/PriceAdjustment",
  PriceBook: "dw/catalog/PriceBook",
  Product: "dw/catalog/Product",
  ProductActiveData: "dw/catalog/ProductActiveData",
  ProductInventoryList: "dw/catalog/ProductInventoryList",
  ProductInventoryRecord: "dw/catalog/ProductInventoryRecord",
  ProductLineItem: "dw/order/ProductLineItem",
  ProductList: "dw/customer/ProductList",
  ProductListItem: "dw/customer/ProductListItem",
  ProductListItemPurchase: "dw/customer/ProductListItemPurchase",
  ProductListRegistrant: "dw/customer/ProductListRegistrant",
  Profile: "dw/customer/Profile",
  Promotion: "dw/campaign/Promotion",
  Recommendation: "dw/catalog/Recommendation",
  Return: "dw/order/Return",
  ReturnCase: "dw/order/ReturnCase",
  ReturnCaseItem: "dw/order/ReturnCaseItem",
  ReturnItem: "dw/order/ReturnItem",
  ServiceConfig: "dw/svc/ServiceConfig",
  ServiceCredential: "dw/svc/ServiceCredential",
  ServiceProfile: "dw/svc/ServiceProfile",
  Shipment: "dw/order/Shipment",
  ShippingLineItem: "dw/order/ShippingLineItem",
  ShippingMethod: "dw/order/ShippingMethod",
  ShippingOrder: "dw/order/ShippingOrder",
  ShippingOrderItem: "dw/order/ShippingOrderItem",
  SitePreferences: "dw/system/SitePreferences",
  SlotConfiguration: "dw/campaign/SlotContent",
  SourceCodeGroup: "dw/campaign/SourceCodeGroup",
  Store: "dw/catalog/Store",
  StoreGroup: "dw/catalog/StoreGroup",
  TrackingInfo: "dw/order/TrackingInfo",
  TrackingRef: "dw/order/TrackingRef",
}

export function generateCustomAttributesTypes(
  options: GenerateCustomAttributesTypesOptions,
): GenerateCustomAttributesTypesResult {
  const existsSync = options.existsSync ?? nodeExistsSync
  const readFileSync = options.readFileSync ?? nodeReadFileSync
  const readdirSync = options.readdirSync ?? nodeReaddirSync
  const statSync = options.statSync ?? nodeStatSync
  const writeFileSync = options.writeFileSync ?? nodeWriteFileSync

  const outputFilePath = resolveGeneratedCustomAttributesTypesPath(options.workspaceRoot)
  const metaDirectory = path.join(
    resolveSiteTemplatePath(options.workspaceRoot, options.siteTemplatePath),
    "meta",
  )
  const dwTypesDirectory = path.join(options.workspaceRoot, ".b2c-script-types", "types", "dw")

  if (!existsSync(dwTypesDirectory)) {
    return {
      outputFilePath,
      sourceFiles: [],
      written: false,
      declarationsCount: 0,
      attributesCount: 0,
    }
  }

  if (!existsSync(metaDirectory)) {
    writeFileSync(
      outputFilePath,
      [
        "/* Auto-generated by sfcc-ts-sync-types. Do not edit manually. */",
        "type SfccEnumValue<TValue> = { getValue(): TValue; getDisplayValue(): string }",
        "",
      ].join("\n"),
      "utf8",
    )

    return {
      outputFilePath,
      sourceFiles: [],
      written: true,
      declarationsCount: 0,
      attributesCount: 0,
    }
  }

  const xmlFiles = listMetaXmlFiles(metaDirectory, readdirSync, statSync)
  if (xmlFiles.length === 0) {
    return {
      outputFilePath,
      sourceFiles: [],
      written: false,
      declarationsCount: 0,
      attributesCount: 0,
    }
  }

  const dwModuleIndex = buildDwModuleIndex(dwTypesDirectory, readdirSync, statSync)
  const typeAttributes = new Map<string, AttributeMap>()
  const customObjectAttributes = new Map<string, AttributeMap>()

  for (const xmlFilePath of xmlFiles) {
    const parsed = parser.parse(readFileSync(xmlFilePath, "utf8")) as ParsedMetadataRoot
    const metadata = parsed.metadata
    if (!metadata) {
      continue
    }

    for (const extension of toArray(metadata["type-extension"])) {
      ingestTypeExtension(extension, typeAttributes)
    }

    for (const customType of toArray(metadata["custom-type"])) {
      ingestCustomType(customType, customObjectAttributes)
    }
  }

  patchSystemObjectMgrDeclarations(dwTypesDirectory, dwModuleIndex, readFileSync, writeFileSync)
  patchCustomObjectMgrDeclarations(
    dwTypesDirectory,
    customObjectAttributes,
    readFileSync,
    writeFileSync,
  )

  const rendered = renderGeneratedDeclarations(
    typeAttributes,
    customObjectAttributes,
    dwModuleIndex,
  )
  if (!rendered) {
    return {
      outputFilePath,
      sourceFiles: xmlFiles,
      written: false,
      declarationsCount: 0,
      attributesCount: 0,
    }
  }

  writeFileSync(outputFilePath, rendered.content, "utf8")

  return {
    outputFilePath,
    sourceFiles: xmlFiles,
    written: true,
    declarationsCount: rendered.declarationsCount,
    attributesCount: rendered.attributesCount,
  }
}

function listMetaXmlFiles(
  metaDirectory: string,
  readdirSync: (dirPath: string) => string[],
  statSync: (filePath: string) => { isDirectory(): boolean },
): string[] {
  const fileNames = readdirSync(metaDirectory).sort((left, right) => left.localeCompare(right))
  return fileNames
    .filter((fileName) => fileName.endsWith(".xml"))
    .map((fileName) => path.join(metaDirectory, fileName))
    .filter((filePath) => !statSync(filePath).isDirectory())
}

function buildDwModuleIndex(
  dwTypesDirectory: string,
  readdirSync: (dirPath: string) => string[],
  statSync: (filePath: string) => { isDirectory(): boolean },
): Map<string, string[]> {
  const byTypeName = new Map<string, string[]>()
  const queue = [dwTypesDirectory]

  while (queue.length > 0) {
    const currentDir = queue.shift()
    if (!currentDir) {
      continue
    }

    const entries = readdirSync(currentDir).sort((left, right) => left.localeCompare(right))
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry)
      if (statSync(fullPath).isDirectory()) {
        queue.push(fullPath)
        continue
      }

      if (!entry.endsWith(".d.ts")) {
        continue
      }

      const typeName = entry.slice(0, -5)
      const moduleSpecifier = `dw/${path
        .relative(dwTypesDirectory, fullPath)
        .replace(/\\/gu, "/")
        .slice(0, -5)}`

      const modules = byTypeName.get(typeName) ?? []
      modules.push(moduleSpecifier)
      modules.sort((left, right) => left.localeCompare(right))
      byTypeName.set(typeName, modules)
    }
  }

  return byTypeName
}

function ingestTypeExtension(
  extension: ParsedTypeExtension,
  target: Map<string, AttributeMap>,
): void {
  const typeId = asString(extension["type-id"])
  if (!typeId) {
    return
  }

  const definitions = extension["custom-attribute-definitions"]
  const attributeDefinitions = toArray(definitions?.["attribute-definition"])
  upsertAttributeDefinitions(target, typeId, attributeDefinitions)
}

function ingestCustomType(customType: ParsedCustomType, target: Map<string, AttributeMap>): void {
  const typeId = asString(customType["type-id"])
  if (!typeId) {
    return
  }

  const definitions = customType["attribute-definitions"]
  const attributeDefinitions = toArray(definitions?.["attribute-definition"])
  upsertAttributeDefinitions(target, typeId, attributeDefinitions)
}

function upsertAttributeDefinitions(
  target: Map<string, AttributeMap>,
  typeId: string,
  attributeDefinitions: ParsedAttributeDefinition[],
): void {
  if (attributeDefinitions.length === 0) {
    return
  }

  const existing = target.get(typeId) ?? new Map<string, GeneratedAttribute>()
  for (const definition of attributeDefinitions) {
    const attributeId = asString(definition["attribute-id"])
    if (!attributeId) {
      continue
    }

    existing.set(attributeId, {
      name: attributeId,
      typeName: toTypescriptType(definition),
      required: asString(definition["mandatory-flag"]) === "true",
    })
  }

  target.set(typeId, existing)
}

function renderGeneratedDeclarations(
  typeAttributes: Map<string, AttributeMap>,
  customObjectAttributes: Map<string, AttributeMap>,
  dwModuleIndex: Map<string, string[]>,
): { content: string; declarationsCount: number; attributesCount: number } | undefined {
  const lines: string[] = [
    "/* Auto-generated by sfcc-ts-sync-types. Do not edit manually. */",
    "type SfccEnumValue<TValue> = { getValue(): TValue; getDisplayValue(): string }",
    "",
  ]
  let declarationsCount = 0
  let attributesCount = 0

  const sortedTypeIds = [...typeAttributes.keys()].sort((left, right) => left.localeCompare(right))
  for (const typeId of sortedTypeIds) {
    const attributeMap = typeAttributes.get(typeId)
    if (!attributeMap || attributeMap.size === 0) {
      continue
    }

    const moduleSpecifier = resolveSystemObjectModule(typeId, dwModuleIndex)
    if (!moduleSpecifier) {
      continue
    }
    const sortedAttributes = [...attributeMap.values()].sort((left, right) =>
      left.name.localeCompare(right.name),
    )
    lines.push(`declare module "${moduleSpecifier}" {`)
    lines.push(`  interface ${typeId}CustomAttributes {`)
    for (const attribute of sortedAttributes) {
      const optionalToken = attribute.required ? "" : "?"
      lines.push(
        `    ${toPropertyIdentifier(attribute.name)}${optionalToken}: ${attribute.typeName}`,
      )
      attributesCount += 1
    }
    lines.push("  }")
    lines.push("}")
    lines.push("")
    declarationsCount += 1
  }

  const customAttributes = mergeCustomObjectAttributes(customObjectAttributes)
  if (customAttributes.length > 0) {
    for (const typeId of [...customObjectAttributes.keys()].sort((left, right) =>
      left.localeCompare(right),
    )) {
      const attributes = customObjectAttributes.get(typeId)
      if (!attributes || attributes.size === 0) {
        continue
      }

      lines.push(`interface ${toCustomObjectAttributesIdentifier(typeId)} {`)
      const sorted = [...attributes.values()].sort((left, right) =>
        left.name.localeCompare(right.name),
      )
      for (const attribute of sorted) {
        const optionalToken = attribute.required ? "" : "?"
        lines.push(
          `  ${toPropertyIdentifier(attribute.name)}${optionalToken}: ${attribute.typeName}`,
        )
        attributesCount += 1
      }
      lines.push("}")
      lines.push("")
    }

    lines.push('declare module "dw/object/CustomObject" {')
    lines.push("  interface CustomObjectCustomAttributes {")
    for (const attribute of customAttributes) {
      const optionalToken = attribute.required ? "" : "?"
      lines.push(
        `    ${toPropertyIdentifier(attribute.name)}${optionalToken}: ${attribute.typeName}`,
      )
      attributesCount += 1
    }
    lines.push("  }")
    lines.push("}")
    lines.push("")
    declarationsCount += 1
  }

  if (declarationsCount === 0) {
    return undefined
  }

  return {
    content: `${lines.join("\n")}`,
    declarationsCount,
    attributesCount,
  }
}

function patchCustomObjectMgrDeclarations(
  dwTypesDirectory: string,
  customObjectAttributes: Map<string, AttributeMap>,
  readFileSync: (filePath: string, encoding: BufferEncoding) => string,
  writeFileSync: (filePath: string, content: string, encoding: BufferEncoding) => void,
): boolean {
  const customObjectMgrFilePath = path.join(dwTypesDirectory, "object", "CustomObjectMgr.d.ts")
  if (!nodeExistsSync(customObjectMgrFilePath)) {
    return false
  }

  const typeIds = [...customObjectAttributes.keys()].sort((left, right) =>
    left.localeCompare(right),
  )
  if (typeIds.length === 0) {
    return false
  }

  const originalContent = readFileSync(customObjectMgrFilePath, "utf8")
  if (originalContent.includes(toCustomObjectAttributesIdentifier(typeIds[0]))) {
    return false
  }

  const lines = originalContent.split("\n")
  for (const marker of [
    "static createCustomObject(type: string, keyValue: string): CustomObject;",
    "static getAllCustomObjects(type: string): SeekableIterator<CustomObject>;",
    "static getCustomObject(type: string, keyValue: string): CustomObject | null;",
    "static queryCustomObject(type: string, queryString: string, ...args: any[]): CustomObject;",
    "static queryCustomObjects(type: string, queryString: string, sortString: string | null, ...args: any[]): SeekableIterator<CustomObject>;",
  ]) {
    const lineIndex = lines.findIndex((line) => line.trim() === marker)
    if (lineIndex < 0) {
      continue
    }

    const indentation = lines[lineIndex].match(/^\s*/u)?.[0] ?? ""
    const typedOverloads = typeIds.flatMap((typeId) => {
      const customObjectType = `CustomObject & { custom: ${toCustomObjectAttributesIdentifier(typeId)} }`
      if (marker === "static createCustomObject(type: string, keyValue: string): CustomObject;") {
        return [
          `${indentation}static createCustomObject(type: "${typeId}", keyValue: string): ${customObjectType};`,
          `${indentation}static createCustomObject(type: "${typeId}", keyValue: number): ${customObjectType};`,
        ]
      }

      if (marker === "static getAllCustomObjects(type: string): SeekableIterator<CustomObject>;") {
        return [
          `${indentation}static getAllCustomObjects(type: "${typeId}"): SeekableIterator<${customObjectType}>;`,
        ]
      }

      if (
        marker === "static getCustomObject(type: string, keyValue: string): CustomObject | null;"
      ) {
        return [
          `${indentation}static getCustomObject(type: "${typeId}", keyValue: string): ${customObjectType} | null;`,
          `${indentation}static getCustomObject(type: "${typeId}", keyValue: number): ${customObjectType} | null;`,
        ]
      }

      if (
        marker ===
        "static queryCustomObject(type: string, queryString: string, ...args: any[]): CustomObject;"
      ) {
        return [
          `${indentation}static queryCustomObject(type: "${typeId}", queryString: string, ...args: any[]): ${customObjectType};`,
        ]
      }

      return [
        `${indentation}static queryCustomObjects(type: "${typeId}", queryString: string, sortString: string | null, ...args: any[]): SeekableIterator<${customObjectType}>;`,
        `${indentation}static queryCustomObjects(type: "${typeId}", queryAttributes: utilMap<any, any>, sortString: string | null): SeekableIterator<${customObjectType}>;`,
      ]
    })

    lines.splice(lineIndex, 0, ...typedOverloads)
  }

  writeFileSync(customObjectMgrFilePath, lines.join("\n"), "utf8")
  return true
}

function toTypeIdentifier(typeId: string): string {
  const sanitized = typeId.replace(/[^A-Za-z0-9_$]/gu, "_")
  if (/^[A-Za-z_$]/u.test(sanitized)) {
    return sanitized
  }

  return `_${sanitized}`
}

function toCustomObjectAttributesIdentifier(typeId: string): string {
  return `CustomObject${toTypeIdentifier(typeId)}CustomAttributes`
}

function patchSystemObjectMgrDeclarations(
  dwTypesDirectory: string,
  dwModuleIndex: Map<string, string[]>,
  readFileSync: (filePath: string, encoding: BufferEncoding) => string,
  writeFileSync: (filePath: string, content: string, encoding: BufferEncoding) => void,
): boolean {
  const systemObjectMgrFilePath = path.join(dwTypesDirectory, "object", "SystemObjectMgr.d.ts")
  if (!nodeExistsSync(systemObjectMgrFilePath)) {
    return false
  }

  const resolvedTypes = SYSTEM_OBJECT_MGR_TYPES.map((typeId) => ({
    moduleSpecifier: resolveSystemObjectModule(typeId, dwModuleIndex),
    typeId,
  })).filter(
    (
      entry,
    ): entry is {
      moduleSpecifier: string
      typeId: (typeof SYSTEM_OBJECT_MGR_TYPES)[number]
    } => Boolean(entry.moduleSpecifier),
  )

  if (resolvedTypes.length === 0) {
    return false
  }

  const originalContent = readFileSync(systemObjectMgrFilePath, "utf8")
  if (originalContent.includes(`static getAllSystemObjects(type: "${resolvedTypes[0].typeId}")`)) {
    return false
  }

  const overloadLines: string[] = []
  for (const { typeId } of resolvedTypes) {
    overloadLines.push(
      `    static getAllSystemObjects(type: "${typeId}"): SeekableIterator<${typeId}>`,
    )
    overloadLines.push(
      `    static querySystemObject(type: "${typeId}", queryString: string, ...args: any[]): ${typeId}`,
    )
    overloadLines.push(
      `    static querySystemObjects(type: "${typeId}", queryString: string, sortString: string | null, ...args: any[]): SeekableIterator<${typeId}>`,
    )
    overloadLines.push(
      `    static querySystemObjects(type: "${typeId}", queryAttributes: utilMap<any, any>, sortString: string | null): SeekableIterator<${typeId}>`,
    )
  }

  const injectionMarker = "  static getAllSystemObjects(type: string):"
  const injectionIndex = originalContent.indexOf(injectionMarker)
  if (injectionIndex < 0) {
    return false
  }

  const patchedContent = `${originalContent.slice(0, injectionIndex)}${overloadLines.join("\n")}
${originalContent.slice(injectionIndex)}`
  writeFileSync(systemObjectMgrFilePath, patchedContent, "utf8")
  return true
}

function mergeCustomObjectAttributes(
  customObjectAttributes: Map<string, AttributeMap>,
): GeneratedAttribute[] {
  const merged = new Map<string, GeneratedAttribute>()
  const typeIds = [...customObjectAttributes.keys()].sort((left, right) =>
    left.localeCompare(right),
  )
  for (const typeId of typeIds) {
    const attributes = customObjectAttributes.get(typeId)
    if (!attributes) {
      continue
    }

    const sorted = [...attributes.values()].sort((left, right) =>
      left.name.localeCompare(right.name),
    )
    for (const attribute of sorted) {
      merged.set(attribute.name, attribute)
    }
  }

  return [...merged.values()].sort((left, right) => left.name.localeCompare(right.name))
}

function resolveSystemObjectModule(
  typeId: string,
  dwModuleIndex: Map<string, string[]>,
): string | undefined {
  const preferredModule = PREFERRED_SYSTEM_OBJECT_MODULES[typeId]
  if (preferredModule && hasModulePath(dwModuleIndex, preferredModule)) {
    return preferredModule
  }

  const candidates = dwModuleIndex.get(typeId) ?? []
  return candidates.length === 1 ? candidates[0] : undefined
}

function hasModulePath(dwModuleIndex: Map<string, string[]>, modulePath: string): boolean {
  for (const candidates of dwModuleIndex.values()) {
    if (candidates.includes(modulePath)) {
      return true
    }
  }

  return false
}

function toTypescriptType(attributeDefinition: ParsedAttributeDefinition): string {
  const rawType = asString(attributeDefinition.type)?.toLowerCase()
  if (!rawType) {
    return "unknown"
  }

  if (rawType.startsWith("enum-of-")) {
    const enumType = toEnumValueType(rawType, attributeDefinition)
    return isSelectMultiple(attributeDefinition) ? `${enumType}[]` : enumType
  }

  if (rawType.startsWith("set-of-")) {
    return toSetValueType(rawType, attributeDefinition)
  }

  return SFCC_TYPE_TO_TYPESCRIPT[rawType] ?? "unknown"
}

function toSetValueType(rawType: string, attributeDefinition: ParsedAttributeDefinition): string {
  void attributeDefinition
  const baseRawType = rawType.slice("set-of-".length)
  if (!baseRawType) {
    return "unknown[]"
  }

  return `${SFCC_TYPE_TO_TYPESCRIPT[baseRawType] ?? "unknown"}[]`
}

function toEnumValueType(rawType: string, attributeDefinition: ParsedAttributeDefinition): string {
  const enumBaseType = rawType.slice("enum-of-".length)
  const inferredBaseType = SFCC_TYPE_TO_TYPESCRIPT[enumBaseType] ?? "unknown"
  const enumValueLiterals = extractEnumValues(attributeDefinition, inferredBaseType)
  if (enumValueLiterals.length > 0) {
    return `SfccEnumValue<${enumValueLiterals.join(" | ")}>`
  }

  if (inferredBaseType === "unknown") {
    return DEFAULT_ENUM_VALUE_TYPE
  }

  return `SfccEnumValue<${inferredBaseType}>`
}

function extractEnumValues(
  attributeDefinition: ParsedAttributeDefinition,
  baseType: string,
): string[] {
  const valueDefinitions = attributeDefinition["value-definitions"]
  if (!isRecord(valueDefinitions)) {
    return []
  }

  const values = toArray(
    valueDefinitions["value-definition"] as ValueDefinition | ValueDefinition[],
  )
    .map((valueDefinition) => toTypedEnumLiteral(valueDefinition.value, baseType))
    .filter((value): value is string => Boolean(value))

  return [...new Set(values)].sort((left, right) => left.localeCompare(right))
}

function toTypedEnumLiteral(value: unknown, baseType: string): string | undefined {
  const text = asString(value)
  if (!text) {
    return undefined
  }

  if (baseType === "number") {
    const asNumber = Number(text)
    if (!Number.isNaN(asNumber) && Number.isFinite(asNumber)) {
      return `${asNumber}`
    }
  }

  if (baseType === "boolean" && (text === "true" || text === "false")) {
    return text
  }

  if (baseType === "Date") {
    return undefined
  }

  return JSON.stringify(text)
}

function toPropertyIdentifier(propertyName: string): string {
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(propertyName)) {
    return propertyName
  }

  return JSON.stringify(propertyName)
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return []
  }

  return Array.isArray(value) ? value : [value]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined
}

function isSelectMultiple(attributeDefinition: ParsedAttributeDefinition): boolean {
  return asString(attributeDefinition["select-multiple-flag"]) === "true"
}

export function getGeneratedCustomAttributesFileName(): string {
  return GENERATED_CUSTOM_ATTRIBUTES_FILE_NAME
}
