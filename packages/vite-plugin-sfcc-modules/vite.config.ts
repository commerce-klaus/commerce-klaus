import { defineConfig } from "vite-plus"

import sfccModules from "./src/index.ts"

export default defineConfig({
  plugins: [
    sfccModules({
      cartridgePath: ["app_brand", "app_core", "app_storefront_base"],
      basePath: "./tests/cartridges",
    }),
  ],
  pack: {
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
    plugins: ["vitest", "jsdoc"],
  },
  fmt: {},
})
