import { ESLint } from "eslint"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { expect, test } from "vite-plus/test"

import {
  cartridgeArchitectureRules,
  configs,
  createCartridgeArchitectureConfig,
  createOxlintArchitectureOverrides,
  createStorefrontConfig,
  pwa,
  recommended,
  sfra,
  sitegenesisControllers,
  sitegenesisPipelines,
  storefrontNext,
} from "../src/index.js"

test.each([
  [
    "storefront-next",
    storefrontNext,
    "error",
    "error",
    "off",
    "error",
    "error",
    ["error", { allow: ["tilde", "superModule"] }],
    "error",
    "error",
    "error",
  ],
  [
    "pwa",
    pwa,
    "error",
    "error",
    "off",
    "error",
    "error",
    ["error", { allow: ["tilde", "superModule"] }],
    "error",
    "error",
    "error",
  ],
  ["sfra", sfra, "off", "off", "off", "off", "error", "off", "off", "off", "error"],
  [
    "sitegenesis-controllers",
    sitegenesisControllers,
    "off",
    "off",
    "off",
    "off",
    "error",
    "off",
    "error",
    "off",
    "error",
  ],
  [
    "sitegenesis-pipelines",
    sitegenesisPipelines,
    "off",
    "off",
    "off",
    "off",
    "off",
    "off",
    "error",
    "off",
    "error",
  ],
] as const)(
  "exports the %s storefront preset",
  (
    preset,
    config,
    noControllers,
    noForms,
    noIsmlRendering,
    noStorefrontIsmlRendering,
    noPipelineApi,
    noProprietaryModuleSyntax,
    noSfraServer,
    preferTildeRequirePath,
    noGlobalRequire,
  ) => {
    expect(configs[preset]).toBe(config)
    expect(config).toHaveLength(1)
    expect(config[0]?.rules).toMatchObject({
      "sfcc/no-controllers": noControllers,
      "sfcc/no-forms": noForms,
      "sfcc/no-isml-rendering": noIsmlRendering,
      "sfcc/no-storefront-isml-rendering": noStorefrontIsmlRendering,
      "sfcc/no-pipeline-api": noPipelineApi,
      "sfcc/no-proprietary-module-syntax": noProprietaryModuleSyntax,
      "sfcc/no-sfra-server": noSfraServer,
      "sfcc/prefer-tilde-require-path": preferTildeRequirePath,
      "sitegenesis/no-global-require": noGlobalRequire,
    })
  },
)

test("targets selected cartridges", () => {
  const config = createStorefrontConfig("pwa", {
    cartridges: ["app_pwa", "int_backend"],
  })

  expect(config[0]?.files).toEqual([
    "cartridges/app_pwa/**/*.{js,ds}",
    "cartridges/int_backend/**/*.{js,ds}",
  ])
})

test("supports a custom cartridges directory", () => {
  const config = createStorefrontConfig("storefront-next", {
    cartridgesDir: "sfcc/cartridges/",
  })

  expect(config[0]?.files).toEqual(["sfcc/cartridges/*/**/*.{js,ds}"])
})

test("supports explicit file globs", () => {
  const config = createStorefrontConfig("sfra", {
    files: ["commerce/**/*.js"],
  })

  expect(config[0]?.files).toEqual(["commerce/**/*.js"])
})

test("exports reusable architecture rule records", () => {
  expect(cartridgeArchitectureRules["storefront-next"]).toMatchObject({
    "sfcc/no-controllers": "error",
    "sfcc/no-storefront-isml-rendering": "error",
    "sfcc/no-sfra-server": "error",
  })
  expect(cartridgeArchitectureRules.sfra).toMatchObject({
    "sfcc/no-controllers": "off",
    "sfcc/no-pipeline-api": "error",
    "sfcc/no-sfra-server": "off",
  })
})

test("creates cartridge-scoped ESLint architecture overlays", () => {
  const config = createCartridgeArchitectureConfig({
    configFile: false,
    cartridgesDir: "commerce/cartridges",
    architectures: {
      "storefront-next": ["app_headless"],
      sfra: ["app_sfra", "int_payments"],
    },
  })

  expect(config.map(({ name, files }) => ({ name, files }))).toEqual([
    {
      name: "@commerce-klaus/eslint-config-sfcc/storefront-next",
      files: ["commerce/cartridges/app_headless/**/*.{js,ds}"],
    },
    {
      name: "@commerce-klaus/eslint-config-sfcc/sfra",
      files: [
        "commerce/cartridges/app_sfra/**/*.{js,ds}",
        "commerce/cartridges/int_payments/**/*.{js,ds}",
      ],
    },
  ])
})

test("creates Oxlint overrides from the same architecture rules", () => {
  const overrides = createOxlintArchitectureOverrides({
    configFile: false,
    architectures: { pwa: ["app_pwa"] },
  })

  expect(overrides).toEqual([
    {
      files: ["cartridges/app_pwa/**/*.{js,ds}"],
      rules: cartridgeArchitectureRules.pwa,
    },
  ])
})

test("loads architecture assignments from the central project config", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sfcc-architectures-"))
  const nestedCwd = path.join(tempRoot, "packages", "example")
  fs.mkdirSync(nestedCwd, { recursive: true })
  fs.writeFileSync(
    path.join(tempRoot, "commerce-klaus.config.js"),
    `export default {
        cartridgesDir: "commerce/cartridges",
        architectures: {
          "storefront-next": ["app_headless"],
          "sitegenesis-controllers": ["bm_tools"],
        },
      }\n`,
  )

  try {
    const config = createCartridgeArchitectureConfig({ cwd: nestedCwd })

    expect(config.map(({ files }) => files)).toEqual([
      ["../../commerce/cartridges/app_headless/**/*.{js,ds}"],
      ["../../commerce/cartridges/bm_tools/**/*.{js,ds}"],
    ])
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
})

test("rejects ambiguous or unknown architecture assignments", () => {
  expect(() =>
    createCartridgeArchitectureConfig({
      configFile: false,
      architectures: {
        "storefront-next": ["app_shared"],
        sfra: ["app_shared"],
      },
    }),
  ).toThrow(/assigned to both "storefront-next" and "sfra"/u)

  expect(() =>
    createCartridgeArchitectureConfig({
      configFile: false,
      architectures: {
        legacy: ["app_legacy"],
      } as never,
    }),
  ).toThrow('Unknown cartridge architecture "legacy".')
})

test.each([
  ["storefront-next", storefrontNext],
  ["pwa", pwa],
] as const)("%s separates storefront and general template policies", (_preset, config) => {
  expect(config[0]?.rules).toMatchObject({
    "sfcc/no-isml-rendering": "off",
    "sfcc/no-storefront-isml-rendering": "error",
    "sfcc/no-template-rendering": "off",
  })
})

test("enforces a headless policy only in selected cartridges", async () => {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [
      ...recommended,
      ...createStorefrontConfig("pwa", {
        cartridges: ["app_pwa"],
      }),
    ],
  })

  const [pwaResult] = await eslint.lintText("module.exports = {}", {
    filePath: "cartridges/app_pwa/cartridge/controllers/Home.js",
  })
  const [sfraResult] = await eslint.lintText("module.exports = {}", {
    filePath: "cartridges/app_sfra/cartridge/controllers/Home.js",
    warnIgnored: false,
  })

  expect(pwaResult?.messages.map((message) => message.ruleId)).toContain("sfcc/no-controllers")
  expect(sfraResult?.messages).toHaveLength(0)
})

test.each([
  ["storefront-next", storefrontNext],
  ["pwa", pwa],
] as const)(
  "%s enforces explicit cross-cartridge and tilde local imports",
  async (_preset, config) => {
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: [...recommended, ...config],
    })

    const [result] = await eslint.lintText(
      `
      const inherited = require("*/cartridge/scripts/helper")
      const namedLocal = require("app_sfra/cartridge/scripts/helper")
      const local = require("~/cartridge/scripts/helper")
      const superModule = module.superModule
      module.exports = { inherited, namedLocal, local, superModule }
    `,
      { filePath: "cartridges/app_sfra/cartridge/scripts/example.js" },
    )

    expect(result?.messages.map((message) => message.ruleId)).toEqual(
      expect.arrayContaining([
        "sfcc/no-proprietary-module-syntax",
        "sfcc/prefer-tilde-require-path",
      ]),
    )
    expect(result?.messages).toHaveLength(2)
  },
)

test.each([
  ["storefront-next", storefrontNext],
  ["pwa", pwa],
  ["sfra", sfra],
  ["sitegenesis-controllers", sitegenesisControllers],
  ["sitegenesis-pipelines", sitegenesisPipelines],
] as const)("%s allows supported modern JavaScript", async (_preset, storefrontConfig) => {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [...recommended, ...storefrontConfig],
  })

  const [result] = await eslint.lintText(
    `
      const source = { items: ["a", "b"] }
      const { items } = source
      const normalize = (value) => \`item:\${value}\`
      const labels = Array.from(items, normalize)
      const entries = Object.entries({ labels })
      function* values() { yield* labels }
      for (let value of values()) {
        if (value.startsWith("item:")) break
      }
      module.exports = { entries, labels }
    `,
    { filePath: "cartridges/app_storefront/cartridge/scripts/modern.js" },
  )

  expect(result?.messages).toHaveLength(0)
})
