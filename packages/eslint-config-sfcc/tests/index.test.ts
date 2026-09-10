import { expect, test } from "vite-plus/test"

import eslintConfigSfcc, {
  configs,
  createGeneratedTypesConfig,
  createRecommendedConfig,
  generatedTypes,
  plugins,
  recommended,
  sfcc,
  sitegenesis,
} from "../src/index.js"

test("exports a recommended flat config", () => {
  expect(Array.isArray(recommended)).toBe(true)
  expect(recommended.length).toBeGreaterThan(0)
})

test("exposes configs.recommended on default export", () => {
  expect(eslintConfigSfcc.configs.recommended).toBe(recommended)
})

test("exports the generated types preset", () => {
  expect(configs["generated-types"]).toBe(generatedTypes)
  expect(generatedTypes[0]?.rules).toEqual({
    "sfcc/prefer-generated-custom-api-types": "error",
    "sfcc/prefer-generated-hook-types": "error",
    "sfcc/prefer-generated-job-step-types": "error",
  })
})

test("creates a generated types preset with shared resolver settings", () => {
  const config = createGeneratedTypesConfig({
    cartridgesDir: "commerce/cartridges/",
    sfcc: { cartridgePath: ["app_custom", "app_base"] },
  })

  expect(config[0]?.files).toEqual(["commerce/cartridges/**/*.{js,ds}"])
  expect(config[0]?.settings).toEqual({
    sfcc: {
      cartridgePath: ["app_custom", "app_base"],
      cartridgesDir: "commerce/cartridges",
    },
  })
})

test("named configs export equals default configs", () => {
  expect(configs).toBe(eslintConfigSfcc.configs)
})

test("exports createRecommendedConfig helper", () => {
  const createdConfig = createRecommendedConfig()
  expect(Array.isArray(createdConfig)).toBe(true)
  expect(createdConfig).toEqual(recommended)
})

test("accepts cartridgesDir with trailing slash", () => {
  const createdConfig = createRecommendedConfig({ cartridgesDir: "cartridges/" })
  expect(createdConfig).toEqual(recommended)
})

test("forwards shared sfcc options via settings", () => {
  const createdConfig = createRecommendedConfig({
    cartridgesDir: "custom-cartridges",
    sfcc: {
      checkCartridgeExists: true,
      cartridgePath: ["app_storefront", "modules"],
    },
  })

  const sfccConfig = createdConfig.find(
    (config) =>
      config.settings !== undefined || config.rules?.["sfcc/valid-require-path"] !== undefined,
  )

  expect(sfccConfig?.settings).toEqual({
    sfcc: {
      checkCartridgeExists: true,
      cartridgePath: ["app_storefront", "modules"],
      cartridgesDir: "custom-cartridges",
    },
  })
  expect(sfccConfig?.rules?.["sfcc/valid-require-path"]).toBe("error")
})

test("exports sitegenesis plugin", () => {
  expect(sitegenesis).toBe(plugins.sitegenesis)
})

test("exports sfcc plugin", () => {
  expect(sfcc).toBe(plugins.sfcc)
})

test("exposes plugins on default export", () => {
  expect(eslintConfigSfcc.plugins).toBe(plugins)
  expect(eslintConfigSfcc.plugins.sfcc).toBe(sfcc)
  expect(eslintConfigSfcc.plugins.sitegenesis).toBe(sitegenesis)
})
