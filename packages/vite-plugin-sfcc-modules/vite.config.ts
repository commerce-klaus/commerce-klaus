import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite-plus"

import sfccModules from "./src/index.ts"

const configDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    sfccModules({
      cartridgePath: ["app_brand", "app_core", "app_storefront_base"],
      basePath: path.resolve(configDir, "tests/cartridges"),
    }),
  ],
  pack: {
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: false,
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
