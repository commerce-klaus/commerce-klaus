import { ESLint } from "eslint"
import { expect, test } from "vite-plus/test"

import {
  configs,
  createStorefrontConfig,
  pwa,
  recommended,
  sfra,
  sitegenesisControllers,
  sitegenesisPipelines,
  storefrontNext,
} from "../src/index.js"

test.each([
  ["storefront-next", storefrontNext, "error", "error", "error", "error", "error", "off"],
  ["pwa", pwa, "error", "error", "error", "error", "error", "off"],
  ["sfra", sfra, "off", "off", "off", "error", "off", "off"],
  ["sitegenesis-controllers", sitegenesisControllers, "off", "off", "off", "off", "error", "error"],
  ["sitegenesis-pipelines", sitegenesisPipelines, "error", "off", "off", "off", "error", "off"],
] as const)(
  "exports the %s storefront preset",
  (
    preset,
    config,
    noControllers,
    noForms,
    noIsmlRendering,
    noPipelineApi,
    noSfraServer,
    noGlobalRequire,
  ) => {
    expect(configs[preset]).toBe(config)
    expect(config).toHaveLength(1)
    expect(config[0]?.rules).toMatchObject({
      "sfcc/no-controllers": noControllers,
      "sfcc/no-forms": noForms,
      "sfcc/no-isml-rendering": noIsmlRendering,
      "sfcc/no-pipeline-api": noPipelineApi,
      "sfcc/no-sfra-server": noSfraServer,
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
