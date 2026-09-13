<script setup lang="ts">
import { onMounted, useTemplateRef } from "vue"

const container = useTemplateRef("container")

onMounted(() => {
  const script = document.createElement("script")
  script.src = "https://giscus.app/client.js"
  script.dataset.repo = "commerce-klaus/commerce-klaus"
  script.dataset.repoId = "R_kgDOS_u8Dg"
  script.dataset.category = "Announcements"
  script.dataset.categoryId = "DIC_kwDOS_u8Ds4DFhl3"
  script.dataset.mapping = "pathname"
  script.dataset.strict = "0"
  script.dataset.reactionsEnabled = "1"
  script.dataset.emitMetadata = "0"
  script.dataset.inputPosition = "bottom"
  script.dataset.theme = "preferred_color_scheme"
  script.dataset.lang = "en"
  script.crossOrigin = "anonymous"
  script.async = true
  container.value?.append(script)
})
</script>

<template>
  <section ref="container" class="giscus-comments" aria-label="Comments" />
</template>
