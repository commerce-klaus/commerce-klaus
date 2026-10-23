<script setup lang="ts">
import { VPLink } from "vitepress/theme"

withDefaults(
  defineProps<{
    action: string
    code?: string
    description?: string
    eyebrow: string
    headingLevel?: 2 | 3 | 4
    href: string
    mark?: string
    title: string
  }>(),
  {
    code: undefined,
    description: undefined,
    headingLevel: 3,
    mark: undefined,
  },
)
</script>

<template>
  <VPLink class="ck-card" :href="href" :no-icon="true">
    <article class="ck-card__body">
      <div :class="{ 'ck-card__heading': mark }">
        <span v-if="mark" class="ck-card__mark" aria-hidden="true">{{ mark }}</span>
        <div>
          <p class="ck-card__eyebrow">{{ eyebrow }}</p>
          <component :is="`h${headingLevel}`" class="ck-card__title">{{ title }}</component>
        </div>
      </div>
      <code v-if="code" class="ck-card__code">{{ code }}</code>
      <div v-if="$slots.default" class="ck-card__description">
        <slot />
      </div>
      <p v-else-if="description" class="ck-card__description">{{ description }}</p>
      <span class="ck-card__action"> {{ action }} <span aria-hidden="true">&rarr;</span> </span>
    </article>
  </VPLink>
</template>
