import { defineConfig } from "vite-plus"

export default defineConfig({
  pack: {
    entry: [
      "src/index.ts",
      "src/typecheck.ts",
      "src/typecheck-cartridges.ts",
      "src/sync-types.ts",
      "src/tsserver-plugin.cts",
    ],
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
