import { defineConfig } from "vite-plus"

export default defineConfig({
  pack: {
    entry: [
      "src/index.ts",
      "src/resolution.ts",
      "src/hooks.ts",
      "src/job-steps.ts",
      "src/custom-apis.ts",
      "src/project.ts",
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
