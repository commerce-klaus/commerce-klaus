import sfccVitest from "@commerce-klaus/vitest-sfcc"
import { defineConfig } from "vite-plus"

export default defineConfig({
  plugins: [sfccVitest()],
  run: {
    tasks: {
      "setup:b2c-plugin": {
        command: "b2c plugins link ../../packages/b2c-plugin --no-install",
        cache: false,
        dependsOn: ["@commerce-klaus/b2c-plugin#build"],
      },
      "lint:cartridges": {
        command: "eslint cartridges",
        dependsOn: ["@commerce-klaus/eslint-config-sfcc#build"],
      },
      test: {
        command: "vp test",
        dependsOn: ["@commerce-klaus/vitest-sfcc#build"],
      },
    },
  },
})
