import { defineConfig } from "vitepress"

const repository = "https://github.com/commerce-klaus/commerce-klaus"

export default defineConfig({
  lang: "en-US",
  title: "Commerce Klaus",
  titleTemplate: ":title | Commerce Klaus",
  description: "Pragmatic developer tooling for Salesforce Commerce Cloud.",
  base: "/commerce-klaus/",
  cleanUrls: true,
  lastUpdated: true,
  sitemap: {
    hostname: "https://commerce-klaus.github.io/commerce-klaus/",
  },
  head: [
    ["meta", { name: "theme-color", content: "#146b4a" }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:site_name", content: "Commerce Klaus" }],
  ],
  themeConfig: {
    logo: "https://avatars.githubusercontent.com/u/294446121?s=96&v=4",
    siteTitle: "Commerce Klaus",
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "Packages", link: "/packages/" },
      { text: "About", link: "/about/philosophy" },
      { text: "Blog", link: "/blog/" },
    ],
    sidebar: {
      "/guide/": [
        {
          text: "Guide",
          items: [
            { text: "Getting started", link: "/guide/getting-started" },
            { text: "Choosing a package", link: "/guide/choosing-a-package" },
          ],
        },
      ],
      "/packages/": [
        {
          text: "Packages",
          items: [
            { text: "Overview", link: "/packages/" },
            { text: "ESLint config", link: "/packages/eslint-config-sfcc/" },
            { text: "TypeScript tooling", link: "/packages/typescript-sfcc/" },
            { text: "Vite plugin", link: "/packages/vite-plugin-sfcc-modules/" },
            { text: "Babel plugin", link: "/packages/babel-plugin-sfcc-modules/" },
            { text: "Module resolver", link: "/packages/sfcc-module-resolver/" },
          ],
        },
        {
          text: "ESLint rules",
          collapsed: true,
          items: [
            {
              text: "SFCC",
              collapsed: true,
              items: [
                {
                  text: "no-custom-api-additional-properties",
                  link: "/packages/eslint-config-sfcc/rules/sfcc/no-custom-api-additional-properties",
                },
                {
                  text: "no-custom-api-response-methods",
                  link: "/packages/eslint-config-sfcc/rules/sfcc/no-custom-api-response-methods",
                },
                {
                  text: "no-ds-files",
                  link: "/packages/eslint-config-sfcc/rules/sfcc/no-ds-files",
                },
                {
                  text: "no-e4x-syntax",
                  link: "/packages/eslint-config-sfcc/rules/sfcc/no-e4x-syntax",
                },
                {
                  text: "no-empty-global",
                  link: "/packages/eslint-config-sfcc/rules/sfcc/no-empty-global",
                },
                {
                  text: "no-rhino-import-globals",
                  link: "/packages/eslint-config-sfcc/rules/sfcc/no-rhino-import-globals",
                },
                {
                  text: "no-string-equals",
                  link: "/packages/eslint-config-sfcc/rules/sfcc/no-string-equals",
                },
                {
                  text: "no-type-annotations",
                  link: "/packages/eslint-config-sfcc/rules/sfcc/no-type-annotations",
                },
                {
                  text: "prefer-const",
                  link: "/packages/eslint-config-sfcc/rules/sfcc/prefer-const",
                },
                {
                  text: "rhino-const-compat",
                  link: "/packages/eslint-config-sfcc/rules/sfcc/rhino-const-compat",
                },
                {
                  text: "rhino-const-conflict",
                  link: "/packages/eslint-config-sfcc/rules/sfcc/rhino-const-conflict",
                },
                {
                  text: "valid-custom-api-dir-name",
                  link: "/packages/eslint-config-sfcc/rules/sfcc/valid-custom-api-dir-name",
                },
                {
                  text: "valid-custom-api-export",
                  link: "/packages/eslint-config-sfcc/rules/sfcc/valid-custom-api-export",
                },
                {
                  text: "valid-hook-export",
                  link: "/packages/eslint-config-sfcc/rules/sfcc/valid-hook-export",
                },
                {
                  text: "valid-require-path",
                  link: "/packages/eslint-config-sfcc/rules/sfcc/valid-require-path",
                },
              ],
            },
            {
              text: "SiteGenesis",
              collapsed: true,
              items: [
                {
                  text: "no-global-require",
                  link: "/packages/eslint-config-sfcc/rules/sitegenesis/no-global-require",
                },
              ],
            },
          ],
        },
      ],
      "/about/": [
        {
          text: "About",
          items: [{ text: "Philosophy", link: "/about/philosophy" }],
        },
      ],
      "/blog/": [
        {
          text: "Blog",
          items: [
            { text: "All posts", link: "/blog/" },
            {
              text: "Why Commerce Klaus?",
              link: "/blog/why-commerce-klaus",
            },
          ],
        },
      ],
    },
    socialLinks: [{ icon: "github", link: repository }],
    search: { provider: "local" },
    editLink: {
      pattern: ({ filePath }) => {
        const editBase = "https://github.com/commerce-klaus/commerce-klaus/edit/main"
        const rulePrefix = "packages/eslint-config-sfcc/rules/"
        if (filePath.startsWith(rulePrefix)) {
          const rulePath = filePath.slice(rulePrefix.length)
          return `${editBase}/docs/packages/eslint-config-sfcc/rules/${rulePath}`
        }

        return `${editBase}/docs/${filePath}`
      },
      text: "Edit this page on GitHub",
    },
    lastUpdated: { text: "Last updated" },
    docFooter: { prev: "Previous", next: "Next" },
    footer: {
      message: "Released under the MIT License.",
      copyright: "Commerce Klaus",
    },
  },
})
