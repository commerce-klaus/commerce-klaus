import { defineConfig } from "vite-plus"

import sfccVitest from "./src/index.js"

export default defineConfig({
  plugins: [
    sfccVitest({
      basePath: "./tests/cartridges",
      cartridgePath: ["app_custom", "app_base"],
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
  },
  fmt: {},
})
