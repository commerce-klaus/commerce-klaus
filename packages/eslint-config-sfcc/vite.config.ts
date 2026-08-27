import { defineConfig } from "vite-plus"

export default defineConfig({
  pack: {
    entry: [
      "src/index.ts",
      "src/configs/eslint-after-oxlint.ts",
      "src/configs/oxlint.ts",
      "src/oxlint/sfcc.ts",
      "src/oxlint/sitegenesis.ts",
    ],
    dts: true,
    exports: true,
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
})
