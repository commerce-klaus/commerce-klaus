<script lang="ts">
import { useData } from "vitepress"
import DefaultTheme from "vitepress/theme"
import { defineComponent, h } from "vue"

import GiscusComments from "./GiscusComments.vue"

export default defineComponent({
  name: "Layout",
  setup(_, { slots }) {
    const { frontmatter, page } = useData()

    return () =>
      h(DefaultTheme.Layout, null, {
        ...slots,
        "doc-after": () => [
          slots["doc-after"]?.(),
          frontmatter.value.blogPost === true
            ? h(GiscusComments, { key: page.value.relativePath })
            : null,
        ],
      })
  },
})
</script>
