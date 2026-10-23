<script setup lang="ts">
import CardGrid from "./CardGrid.vue"
import DocumentationCard from "./DocumentationCard.vue"

const architectures = [
  {
    mark: "SN",
    family: "Headless",
    name: "Storefront Next",
    id: "storefront-next",
    link: "/guide/cartridge-architectures#storefront-next",
    description:
      "For cartridges serving Storefront Next without SFRA controllers, forms, storefront ISML rendering, or the legacy Pipeline API.",
  },
  {
    mark: "PWA",
    family: "Headless",
    name: "PWA",
    id: "pwa",
    link: "/guide/cartridge-architectures#pwa",
    description:
      "For cartridges supporting a PWA storefront through APIs and headless integration points rather than SFRA controller conventions.",
  },
  {
    mark: "SFRA",
    family: "Reference storefront",
    name: "SFRA",
    id: "sfra",
    link: "/guide/cartridge-architectures#sfra",
    description:
      "For Storefront Reference Architecture cartridges using controllers, the server module, forms, and storefront rendering.",
  },
  {
    mark: "SG-C",
    family: "Legacy controllers",
    name: "SiteGenesis Controllers",
    id: "sitegenesis-controllers",
    link: "/guide/cartridge-architectures#sitegenesis-controllers",
    description:
      "For controller-based SiteGenesis cartridges that do not use the SFRA server module or the legacy Pipeline API.",
  },
  {
    mark: "SG-P",
    family: "Legacy pipelines",
    name: "SiteGenesis Pipelines",
    id: "sitegenesis-pipelines",
    link: "/guide/cartridge-architectures#sitegenesis-pipelines",
    description:
      "For pipeline-era SiteGenesis cartridges. This is the only architecture policy that permits access to the legacy Pipeline API.",
  },
] as const
</script>

<template>
  <CardGrid class="architecture-cards">
    <li v-for="architecture in architectures" :key="architecture.id">
      <DocumentationCard
        class="architecture-card"
        action="Architecture details"
        :code="architecture.id"
        :description="architecture.description"
        :eyebrow="architecture.family"
        :heading-level="4"
        :href="architecture.link"
        :mark="architecture.mark"
        :title="architecture.name"
      />
    </li>
  </CardGrid>
</template>
