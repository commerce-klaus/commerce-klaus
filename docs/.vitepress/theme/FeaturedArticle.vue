<script setup lang="ts">
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
  <article class="featured-article">
    <p class="label">{{ label }}</p>
    <h2>
      <a :href="href">{{ title }}</a>
    </h2>
    <div class="description">
      <slot />
    </div>
    <a class="link" :href="href"> {{ linkText }} <span aria-hidden="true">&rarr;</span> </a>
  </article>
</template>

<style scoped>
.featured-article {
  margin: 32px 0 40px;
  padding: 24px;
  border: 1px solid var(--vp-c-divider);
  border-left: 4px solid var(--vp-c-brand-1);
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
}

.label {
  margin: 0 0 8px;
  color: var(--vp-c-brand-1);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h2 {
  margin: 0;
  padding: 0;
  border: 0;
}

h2 a {
  color: var(--vp-c-text-1);
  text-decoration: none;
}

h2 a:hover {
  color: var(--vp-c-brand-1);
}

.description :deep(p) {
  margin: 12px 0 16px;
  color: var(--vp-c-text-2);
}

.link {
  font-weight: 700;
}
</style>
