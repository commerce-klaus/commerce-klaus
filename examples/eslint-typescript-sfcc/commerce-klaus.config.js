import { defineConfig } from "@commerce-klaus/config"

export default defineConfig({
  cartridgesDir: "cartridges",
  architectures: {
    sfra: ["app_custom", "app_example"],
  },
  solutionConfigPath: "cartridges/jsconfig.json",
  siteTemplatePath: "sites/site_template",
  site: "Example",
})
