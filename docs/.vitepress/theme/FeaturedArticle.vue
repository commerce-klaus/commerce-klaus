<script setup lang="ts">
import DocumentationCard from "./DocumentationCard.vue"

withDefaults(
  defineProps<{
    href: string
    title: string
    label?: string
    linkText?: string
  }>(),
  {
    label: "Featured article",
    linkText: "Read the article",
  },
)
</script>

<template>
  <DocumentationCard
    class="featured-article"
    :action="linkText"
    :eyebrow="label"
    :heading-level="2"
    :href="href"
    :title="title"
  >
    <slot />
  </DocumentationCard>
</template>

<style scoped>
.featured-article {
  margin: 32px 0 40px;
}
</style>
