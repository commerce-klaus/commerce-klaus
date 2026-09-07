import { withBlogTheme } from "vitepress-plugin-blog"
import DefaultTheme from "vitepress/theme"

import "./style.d.ts"
import "vitepress-plugin-blog/style.css"

import "./style.css"

export default withBlogTheme(DefaultTheme)
