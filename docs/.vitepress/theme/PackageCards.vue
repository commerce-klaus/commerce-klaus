<script setup lang="ts">
import CardGrid from "./CardGrid.vue"
import DocumentationCard from "./DocumentationCard.vue"

interface PackageCard {
  details: string
  eyebrow: string
  link: string
  mark: string
  packageName: string
  title: string
}

defineProps<{
  items: PackageCard[]
}>()
</script>

<template>
  <CardGrid class="package-cards">
    <li v-for="item in items" :key="item.packageName">
      <DocumentationCard
        class="package-card"
        action="Explore package"
        :code="item.packageName"
        :description="item.details"
        :eyebrow="item.eyebrow"
        :href="item.link"
        :mark="item.mark"
        :title="item.title"
      />
    </li>
  </CardGrid>
</template>
