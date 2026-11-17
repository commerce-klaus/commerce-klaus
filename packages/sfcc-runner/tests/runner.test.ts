import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createSfccRunner, type SfccRunner, type SfccRunnerOptions } from "../src/index.js"

describe("sfcc-runner", () => {
  let projectRoot: string
  let runner: SfccRunner | undefined

  function writeCartridgeFile(cartridge: string, filePath: string, source: string): string {
    const absolutePath = path.join(projectRoot, "cartridges", cartridge, "cartridge", filePath)
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true })
    fs.writeFileSync(absolutePath, source)
    return absolutePath
  }

  function createRunner(options: Partial<Pick<SfccRunnerOptions, "runtime">> = {}) {
    return createSfccRunner({
      basePath: "cartridges",
      cartridgePath: ["app_custom", "app_base"],
      configFile: false,
      cwd: projectRoot,
      ...options,
    })
  }

  beforeEach(() => {
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sfcc-runner-"))
    fs.mkdirSync(path.join(projectRoot, "cartridges", "app_custom"), { recursive: true })
    fs.mkdirSync(path.join(projectRoot, "cartridges", "app_base"), { recursive: true })
  })

  afterEach(() => {
    runner?.close()
    runner = undefined
    fs.rmSync(projectRoot, { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  it("uses project configuration by default and lets explicit options override it", () => {
    writeCartridgeFile("app_custom", "scripts/order.js", "module.exports = 'custom'")
    writeCartridgeFile("app_base", "scripts/order.js", "module.exports = 'base'")

    const sitePath = path.join(
      projectRoot,
      "sites",
      "site_template",
      "sites",
      "ExampleSite",
      "site.xml",
    )
    fs.mkdirSync(path.dirname(sitePath), { recursive: true })
    fs.writeFileSync(
      sitePath,
      "<site><custom-cartridges>app_custom:app_base</custom-cartridges></site>",
    )
    fs.writeFileSync(
      path.join(projectRoot, "commerce-klaus.config.js"),
      `export default {
  cartridgesDir: "cartridges",
  siteTemplatePath: "sites/site_template",
  site: "ExampleSite",
  envCartridgePath: ""
}`,
    )

    runner = createSfccRunner({ cwd: projectRoot })
    expect(runner.load("*/cartridge/scripts/order")).toBe("custom")
    runner.close()
    runner = undefined

    runner = createSfccRunner({ cartridgePath: ["app_base"], cwd: projectRoot })
    expect(runner.load("*/cartridge/scripts/order")).toBe("base")
  })

  it("loads cartridge CommonJS and applies module mocks before execution", () => {
    writeCartridgeFile(
      "app_custom",
      "scripts/mapping.js",
      `const getProvider = function () { return require("*/cartridge/scripts/provider") }
const logger = require("dw/system/Logger")
module.exports = {
  create: function () {
    const provider = getProvider()
    return {
      cached: provider === getProvider(),
      tax: provider.getTaxContext(),
      logged: logger.info("mapping loaded")
    }
  }
}`,
    )
    writeCartridgeFile(
      "app_custom",
      "scripts/provider.js",
      "module.exports = { getTaxContext: function () { return 'cartridge' } }",
    )

    runner = createRunner()
    runner.mock("*/cartridge/scripts/provider", {
      getTaxContext: () => "mocked",
    })
    const logMessages: string[] = []
    runner.mock("dw/system/Logger", {
      info: (message: string) => logMessages.push(message),
    })

    const result = runner.invoke<[], { cached: boolean; logged: number; tax: string }>(
      "app_custom/cartridge/scripts/mapping",
      "create",
    )

    expect(result).toEqual({ cached: true, logged: 1, tax: "mocked" })
    expect(logMessages).toEqual(["mapping loaded"])
  })

  it("exposes default Logger output and preserves it after close", () => {
    writeCartridgeFile(
      "app_custom",
      "scripts/logging.js",
      `const Logger = require("dw/system/Logger")
module.exports = function () {
  Logger.warn("Mapping warning: {0}", "example")
  Logger.error("Mapping failed")
}`,
    )

    const forwardedEntries: string[] = []
    const activeRunner = createRunner({
      runtime: {
        onLoggerEntry: (entry) => {
          const output =
            entry.level === "warn" || entry.level === "error" || entry.level === "fatal"
              ? "stderr"
              : "stdout"
          forwardedEntries.push(`${output}: ${entry.message}`)
        },
      },
    })
    runner = activeRunner
    activeRunner.invoke("app_custom/cartridge/scripts/logging", "default")
    const expectedEntries = [
      { level: "warn", message: "Mapping warning: {0}", parameters: ["example"] },
      { level: "error", message: "Mapping failed", parameters: [] },
    ]

    expect(activeRunner.loggerEntries).toEqual(expectedEntries)
    expect(forwardedEntries).toEqual(["stderr: Mapping warning: {0}", "stderr: Mapping failed"])
    activeRunner.close()
    runner = undefined
    expect(activeRunner.loggerEntries).toEqual(expectedEntries)
  })

  it("writes default Logger levels to console and supports disabling forwarding", () => {
    writeCartridgeFile(
      "app_custom",
      "scripts/logging.js",
      `const Logger = require("dw/system/Logger")
module.exports = function () {
  Logger.debug("debug message")
  Logger.info("info message")
  Logger.warn("warning message")
  Logger.error("error message")
  Logger.fatal("fatal message")
}`,
    )

    const log = vi.spyOn(console, "log").mockImplementation(() => {})
    const info = vi.spyOn(console, "info").mockImplementation(() => {})
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const error = vi.spyOn(console, "error").mockImplementation(() => {})

    runner = createRunner()
    runner.invoke("app_custom/cartridge/scripts/logging", "default")
    expect(log).toHaveBeenCalledWith("debug message")
    expect(info).toHaveBeenCalledWith("info message")
    expect(warn).toHaveBeenCalledWith("warning message")
    expect(error).toHaveBeenCalledWith("error message")
    expect(error).toHaveBeenCalledWith("fatal message")
    runner.close()
    runner = undefined

    runner = createRunner({ runtime: { onLoggerEntry: false } })
    runner.invoke("app_custom/cartridge/scripts/logging", "default")
    expect(log).toHaveBeenCalledTimes(1)
    expect(info).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(error).toHaveBeenCalledTimes(2)
  })

  it("uses the next cartridge implementation for module.superModule", () => {
    writeCartridgeFile(
      "app_custom",
      "scripts/inherited.js",
      `const base = module.superModule
module.exports = function () { return base() + "-custom" }`,
    )
    const baseModulePath = writeCartridgeFile(
      "app_base",
      "scripts/inherited.js",
      "module.exports = function () { return 'base' }",
    )

    runner = createRunner()
    expect(runner.invoke<[], string>("app_custom/cartridge/scripts/inherited", "default")).toBe(
      "base-custom",
    )
    runner.close()
    runner = undefined

    runner = createRunner()
    runner.mockResolved(baseModulePath, () => "mocked")
    expect(runner.invoke<[], string>("app_custom/cartridge/scripts/inherited", "default")).toBe(
      "mocked-custom",
    )
  })

  it("isolates site preferences and globals between sequential runners", () => {
    const originalRequest = Object.getOwnPropertyDescriptor(globalThis, "request")
    const originalSession = Object.getOwnPropertyDescriptor(globalThis, "session")
    writeCartridgeFile(
      "app_custom",
      "scripts/Example-Mapping.js",
      `const Site = require("dw/system/Site")
const getContext = function () { return require("./context") }
module.exports = {
  createPayload: function () {
    const context = getContext()
    return {
      cached: context === getContext(),
      locale: request.locale,
      site: Site.getCurrent().ID,
      taxClass: Site.getCurrent().getCustomPreferenceValue("taxClass"),
      token: context.token
    }
  }
}`,
    )
    writeCartridgeFile(
      "app_custom",
      "scripts/context.js",
      "module.exports = { token: session.custom.taxToken }",
    )

    runner = createRunner({
      runtime: {
        globals: {
          request: { locale: "en_US" },
          session: { custom: { taxToken: "example-token" } },
        },
        site: { id: "ExampleStore", preferences: { taxClass: "example-tax" } },
      },
    })
    expect(
      runner.invoke<
        [],
        { cached: boolean; locale: string; site: string; taxClass: string; token: string }
      >("app_custom/cartridge/scripts/Example-Mapping", "createPayload"),
    ).toEqual({
      cached: true,
      locale: "en_US",
      site: "ExampleStore",
      taxClass: "example-tax",
      token: "example-token",
    })
    runner.close()
    runner = undefined
    expect(Object.getOwnPropertyDescriptor(globalThis, "request")).toEqual(originalRequest)
    expect(Object.getOwnPropertyDescriptor(globalThis, "session")).toEqual(originalSession)

    runner = createRunner({
      runtime: {
        globals: {
          request: { locale: "de_DE" },
          session: { custom: { taxToken: "alternate-token" } },
        },
        site: { id: "SampleStore", preferences: { taxClass: "alternate-tax" } },
      },
    })
    expect(
      runner.invoke<
        [],
        { cached: boolean; locale: string; site: string; taxClass: string; token: string }
      >("app_custom/cartridge/scripts/Example-Mapping", "createPayload"),
    ).toEqual({
      cached: true,
      locale: "de_DE",
      site: "SampleStore",
      taxClass: "alternate-tax",
      token: "alternate-token",
    })
  })

  it("reports missing modules and unsupported dynamic imports", () => {
    writeCartridgeFile(
      "app_custom",
      "scripts/dynamic.js",
      'module.exports = function () { return import("./context.js") }',
    )

    const activeRunner = createRunner()
    runner = activeRunner
    expect(() => activeRunner.load("app_custom/cartridge/scripts/missing")).toThrow(
      "SFCC runner cannot resolve",
    )
    expect(() => activeRunner.load("app_custom/cartridge/scripts/dynamic")).toThrow(
      "does not support dynamic import()",
    )
  })

  it("rejects concurrent runners and releases the slot after invocation errors", () => {
    writeCartridgeFile(
      "app_custom",
      "scripts/failing.js",
      "module.exports = { run: function () { throw new Error('mapping failed') } }",
    )

    runner = createRunner()
    expect(() => createRunner()).toThrow("Only one SFCC runner can be open at a time")
    try {
      expect(() => runner?.invoke("app_custom/cartridge/scripts/failing", "run")).toThrow(
        "mapping failed",
      )
    } finally {
      runner.close()
      runner = undefined
    }

    const activeRunner = createRunner()
    runner = activeRunner
    expect(() => activeRunner.load("app_custom/cartridge/scripts/missing")).toThrow(
      "SFCC runner cannot resolve",
    )
  })

  it("requires mocks for SFCC APIs without a focused runtime implementation", () => {
    writeCartridgeFile(
      "app_custom",
      "scripts/unimplemented.js",
      'module.exports = require("dw/system/Unimplemented")',
    )

    const activeRunner = createRunner()
    runner = activeRunner
    expect(() => activeRunner.load("app_custom/cartridge/scripts/unimplemented")).toThrow(
      "SFCC runner cannot resolve",
    )
    activeRunner.close()
    runner = undefined

    runner = createRunner()
    runner.mock("dw/system/Unimplemented", { supported: true })
    expect(runner.load("app_custom/cartridge/scripts/unimplemented")).toEqual({
      supported: true,
    })
  })

  it("rejects mock registration after module loading starts and closes idempotently", () => {
    writeCartridgeFile("app_custom", "scripts/subject.js", "module.exports = {}")

    runner = createRunner()
    runner.load("app_custom/cartridge/scripts/subject")
    expect(() => runner?.mock("dw/system/Logger", {})).toThrow(
      "Register SFCC runner mocks before loading any modules",
    )
    runner.close()
    runner.close()
    expect(() => runner?.load("app_custom/cartridge/scripts/subject")).toThrow(
      "This SFCC runner is closed",
    )
  })
})
