import { withBlogTheme } from "vitepress-plugin-blog"
import DefaultTheme from "vitepress/theme"

import ArchitectureCards from "./ArchitectureCards.vue"
import FeaturedArticle from "./FeaturedArticle.vue"
import Layout from "./Layout.vue"
import PackageCards from "./PackageCards.vue"
import ProjectGraphDiagram from "./ProjectGraphDiagram.vue"
import "./style.d.ts"
import "vitepress-plugin-blog/style.css"

import "./style.css"

export default withBlogTheme({
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component("ArchitectureCards", ArchitectureCards)
    app.component("FeaturedArticle", FeaturedArticle)
    app.component("PackageCards", PackageCards)
    app.component("ProjectGraphDiagram", ProjectGraphDiagram)
  },
})
