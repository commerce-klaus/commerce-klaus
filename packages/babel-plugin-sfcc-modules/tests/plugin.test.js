import { transformSync } from "@babel/core"
import fs from "node:fs"
import { createRequire } from "node:module"
import { describe, expect, it } from "vite-plus/test"

import plugin from "../src/index.ts"

const require = createRequire(import.meta.url)
const jsExtension = require.extensions[".js"]

require.extensions[".js"] = (module, filename) => {
  if (!filename.includes("/tests/cartridges/")) {
    jsExtension(module, filename)
    return
  }

  const source = fs.readFileSync(filename, "utf8")
  const result = transformSync(source, {
    babelrc: false,
    configFile: false,
    filename,
    plugins: [
      [
        plugin,
        {
          cartridgePath: ["app_brand", "app_core", "app_storefront_base"],
          basePath: "./tests/cartridges",
        },
      ],
    ],
  })

  module._compile(result?.code ?? source, filename)
}

const hello = require("./cartridges/app_core/cartridge/scripts/hello")
const hallo = require("./cartridges/app_core/cartridge/scripts/hallo")
const bonjour = require("./cartridges/app_core/cartridge/scripts/bonjour")
const petstore = require("./cartridges/app_core/cartridge/scripts/petstore")
const things = require("./cartridges/app_brand/cartridge/scripts/things")

describe("babel-plugin-sfcc-modules", () => {
  it("can handle require('*') with a module in cartridge path behind.", () => {
    expect(hello).toBe("Hello World")
  })

  it("can handle require('*') with a module in cartridge path before", () => {
    expect(hallo).toBe("Hallo Welt")
  })

  it("can handle require('*') with a module in the same cartridge in cartridge path", () => {
    expect(bonjour).toBe("Bonjour monde")
  })

  it("can handle require('^')", () => {
    expect(petstore).toBe("Cat")
  })

  it("can handle module.exports", () => {
    expect(things()).toStrictEqual(["badger", "mushroom", "snake"])
  })
})
