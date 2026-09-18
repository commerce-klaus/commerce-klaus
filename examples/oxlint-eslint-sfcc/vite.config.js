import sfccOxlint from "@commerce-klaus/eslint-config-sfcc/configs/oxlint"
import sfccModules from "@commerce-klaus/vite-plugin-sfcc-modules"
import { defineConfig } from "vite-plus"

export default defineConfig({
  plugins: [sfccModules()],
  lint: {
    ...sfccOxlint.lint,
  },
  run: {
    tasks: {
      "setup:b2c-plugin": {
        command: "b2c plugins link ../../packages/b2c-plugin --no-install",
        cache: false,
        dependsOn: ["@commerce-klaus/b2c-plugin#build"],
      },
      lint: {
        command: "vp lint && eslint cartridges",
        dependsOn: ["@commerce-klaus/eslint-config-sfcc#build"],
      },
      test: {
        command: "vp test",
        dependsOn: ["@commerce-klaus/vite-plugin-sfcc-modules#build"],
      },
    },
  },
})
