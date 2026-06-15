import { describe, expect, it } from "vite-plus/test"

import things from "./cartridges/app_brand/cartridge/scripts/things.js"
import bonjour from "./cartridges/app_core/cartridge/scripts/bonjour.js"
import hallo from "./cartridges/app_core/cartridge/scripts/hallo.js"
import hello from "./cartridges/app_core/cartridge/scripts/hello.js"
import petstore from "./cartridges/app_core/cartridge/scripts/petstore.js"

describe("vite-plugin-sfcc-modules", () => {
  it("can handle require('*') with a module in cartridge path behind.", () => {
    expect(hello).toBe("Hello World")
  })

  it("can handle require('*') with a module in cartridge path before", () => {
    expect(hallo).toBe("Hallo Welt")
  })

  it("can handle require('*') with a module in the same cartridge in cartridge path", () => {
    expect(bonjour).toBe("Bonjour monde")
  })

  it("can handle require('~')", () => {
    expect(petstore).toBe("Cat")
  })

  it("can handle module.superModule", () => {
    expect(things()).toStrictEqual(["badger", "mushroom", "snake"])
  })
})
