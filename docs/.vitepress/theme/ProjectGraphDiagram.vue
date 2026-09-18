<script setup lang="ts">
import { useData } from "vitepress"
import { onMounted, ref, watch } from "vue"

const properties = defineProps<{ encodedDefinition: string }>()
const { isDark } = useData()
const diagram = ref<HTMLElement>()
const error = ref<string>()
let renderSequence = 0

function decodeDefinition(): string {
  const bytes = Uint8Array.from(atob(properties.encodedDefinition), (character) =>
    character.charCodeAt(0),
  )
  return new TextDecoder().decode(bytes)
}

async function renderDiagram(): Promise<void> {
  const sequence = ++renderSequence
  const definition = decodeDefinition()

  try {
    const { default: mermaid } = await import("mermaid")
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: isDark.value ? "dark" : "default",
    })
    const { svg } = await mermaid.render(`project-graph-${sequence}`, definition)
    if (sequence === renderSequence && diagram.value) {
      diagram.value.innerHTML = svg
      const renderedSvg = diagram.value.querySelector("svg")
      if (renderedSvg) {
        const naturalWidth = renderedSvg.viewBox.baseVal.width
        renderedSvg.style.width = `${Math.min(Math.max(naturalWidth, 760), 1600)}px`
      }
      error.value = undefined
    }
  } catch (cause) {
    if (sequence === renderSequence) {
      error.value = cause instanceof Error ? cause.message : String(cause)
    }
  }
}

onMounted(renderDiagram)
watch(isDark, renderDiagram)
</script>

<template>
  <div class="project-graph-diagram">
    <div ref="diagram" aria-label="Generated SFCC project relationship graph" role="img" />
    <pre v-if="error"><code>{{ decodeDefinition() }}</code></pre>
    <ul v-else class="project-graph-legend" aria-label="Graph node types">
      <li class="cartridge">Cartridge</li>
      <li class="module">Module</li>
      <li class="hook">Hook</li>
      <li class="job-step">Job step</li>
      <li class="middleware">Middleware</li>
      <li class="custom-api">Custom API</li>
      <li class="route">SFRA route</li>
      <li class="schema">Schema</li>
    </ul>
  </div>
</template>

<style scoped>
.project-graph-diagram {
  margin: 24px 0;
  overflow-x: auto;
  padding: 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.project-graph-diagram :deep(svg) {
  display: block;
  min-width: 760px;
  max-width: none;
  height: auto;
  margin: 0 auto;
}

.project-graph-diagram pre {
  margin: 0;
  white-space: pre-wrap;
}

.project-graph-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin: 16px 0 0;
  padding: 12px 0 0;
  border-top: 1px solid var(--vp-c-divider);
  list-style: none;
  color: var(--vp-c-text-2);
  font-size: 12px;
}

.project-graph-legend li {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.project-graph-legend li::before {
  width: 10px;
  height: 10px;
  border: 1px solid;
  border-radius: 2px;
  content: "";
}

.project-graph-legend .cartridge::before {
  border-color: #315d7d;
  background: #d9e8f5;
}

.project-graph-legend .module::before {
  border-color: #65727b;
  background: #edf1f3;
}

.project-graph-legend .hook::before {
  border-color: #3d7855;
  background: #dff2e6;
}

.project-graph-legend .job-step::before {
  border-color: #99711d;
  background: #fff0c7;
}

.project-graph-legend .middleware::before {
  border-color: #47818c;
  background: #f4f7f8;
}

.project-graph-legend .custom-api::before {
  border-color: #a44f48;
  background: #f9dfdc;
}

.project-graph-legend .route::before {
  border-color: #31766d;
  background: #dcefeb;
}

.project-graph-legend .schema::before {
  border-color: #705d91;
  background: #e8e2f2;
}
</style>
