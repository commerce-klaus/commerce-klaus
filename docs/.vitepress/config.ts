import { defineConfig } from "vitepress"

const repository = "https://github.com/commerce-klaus/commerce-klaus"
const base = "/commerce-klaus/"
const noWrap = (text: string) =>
  text
    .replaceAll("Salesforce Commerce Cloud", "Salesforce\u00a0Commerce\u00a0Cloud")
    .replaceAll("Commerce Klaus", "Commerce\u00a0Klaus")

export default defineConfig({
  lang: "en-US",
  title: noWrap("Commerce Klaus"),
  titleTemplate: noWrap(":title | Commerce Klaus"),
  description: noWrap("Pragmatic developer tooling for Salesforce Commerce Cloud."),
  base,
  cleanUrls: true,
  lastUpdated: true,
  sitemap: {
    hostname: "https://commerce-klaus.github.io/commerce-klaus/",
  },
  head: [
    ["link", { rel: "icon", type: "image/png", sizes: "64x64", href: `${base}favicon.png` }],
    ["meta", { name: "theme-color", content: "#146b4a" }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:site_name", content: noWrap("Commerce Klaus") }],
  ],
  markdown: {
    config(markdown) {
      const renderFence = markdown.renderer.rules.fence
      if (renderFence) {
        markdown.renderer.rules.fence = (tokens, index, options, environment, renderer) => {
          const title = tokens[index].info.match(/\[(.*)\]/)?.[1]
          let codeGroupDepth = 0

          for (let tokenIndex = 0; tokenIndex < index; tokenIndex += 1) {
            if (tokens[tokenIndex].type === "container_code-group_open") codeGroupDepth += 1
            if (tokens[tokenIndex].type === "container_code-group_close") codeGroupDepth -= 1
          }

          const code = renderFence(tokens, index, options, environment, renderer)
          if (!title || codeGroupDepth > 0) return code

          return `<div class="vp-code-block-with-title"><div class="vp-code-block-title">${markdown.utils.escapeHtml(title)}</div>${code}</div>`
        }
      }

      markdown.core.ruler.after("inline", "non-breaking-brand-names", (state) => {
        for (const token of state.tokens) {
          for (const child of token.children ?? []) {
            if (child.type === "text") child.content = noWrap(child.content)
          }
        }
      })
    },
  },
  themeConfig: {
    logo: "https://avatars.githubusercontent.com/u/294446121?s=96&v=4",
    siteTitle: noWrap("Commerce Klaus"),
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
            { text: "Vitest integration", link: "/packages/vitest-sfcc/" },
            { text: "Test runtime", link: "/packages/sfcc-test-runtime/" },
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
                  text: "no-platform-globals",
                  link: "/packages/eslint-config-sfcc/rules/sfcc/no-platform-globals",
                },
                {
                  text: "no-proprietary-module-syntax",
                  link: "/packages/eslint-config-sfcc/rules/sfcc/no-proprietary-module-syntax",
                },
                {
                  text: "no-rhino-extensions",
                  link: "/packages/eslint-config-sfcc/rules/sfcc/no-rhino-extensions",
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
                  text: "prefer-native-collections",
                  link: "/packages/eslint-config-sfcc/rules/sfcc/prefer-native-collections",
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
              text: noWrap("Why Commerce Klaus?"),
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
      copyright: noWrap("Commerce Klaus"),
    },
  },
})
