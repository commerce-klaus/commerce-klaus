import path from "node:path"
import { defineConfig } from "vite-plus"

import sfccVitest from "./src/index.js"

export default defineConfig({
  resolve: {
    alias: {
      "@commerce-klaus/vitest-sfcc/runtime": path.resolve(import.meta.dirname, "src/runtime.ts"),
    },
  },
  plugins: [
    sfccVitest({
      basePath: "./tests/cartridges",
      cartridgePath: ["app_custom", "app_base"],
    }),
  ],
  pack: {
    entry: ["src/index.ts", "src/runtime.ts"],
    format: ["esm", "cjs"],
    dts: true,
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
})
