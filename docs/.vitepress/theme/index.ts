import { withBlogTheme } from "vitepress-plugin-blog"
import DefaultTheme from "vitepress/theme"

import FeaturedArticle from "./FeaturedArticle.vue"
import Layout from "./Layout.vue"
import ProjectGraphDiagram from "./ProjectGraphDiagram.vue"
import "./style.d.ts"
import "vitepress-plugin-blog/style.css"

import "./style.css"

export default withBlogTheme({
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component("FeaturedArticle", FeaturedArticle)
    app.component("ProjectGraphDiagram", ProjectGraphDiagram)
  },
})
