import { promises as fs } from "node:fs"
import path from "node:path"

const rootDir = process.cwd()
const packagesDir = path.join(rootDir, "packages")

const MONOREPO_HEADING = "## Monorepo Releases"
const LEGACY_HEADING = "## Legacy Releases (Before Monorepo Migration)"
const MONOREPO_PLACEHOLDER = "Changesets-generated entries will be added here going forward."

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function extractLeadingReleaseBlocks(preMonorepo) {
  const lines = preMonorepo.split("\n")
  const firstReleaseIndex = lines.findIndex(
    (line) =>
      /^##\s+/.test(line.trim()) &&
      line.trim() !== MONOREPO_HEADING &&
      line.trim() !== LEGACY_HEADING,
  )

  if (firstReleaseIndex === -1) {
    return { cleanedPrefix: preMonorepo, releaseBlocks: "" }
  }

  const cleanedPrefix = lines.slice(0, firstReleaseIndex).join("\n").replace(/\s*$/, "\n\n")
  const releaseBlocks = lines.slice(firstReleaseIndex).join("\n").trim()

  return { cleanedPrefix, releaseBlocks }
}

function normalizeChangelogContent(content) {
  const monorepoMatch = content.match(/^## Monorepo Releases\s*$/m)
  const legacyMatch = content.match(/^## Legacy Releases \(Before Monorepo Migration\)\s*$/m)

  if (!monorepoMatch || !legacyMatch || monorepoMatch.index >= legacyMatch.index) {
    return { changed: false, nextContent: content }
  }

  const monorepoStart = monorepoMatch.index
  const monorepoEnd = monorepoStart + monorepoMatch[0].length
  const legacyStart = legacyMatch.index

  const prefix = content.slice(0, monorepoStart)
  const monorepoBody = content.slice(monorepoEnd, legacyStart)
  const legacyAndAfter = content.slice(legacyStart)

  const { cleanedPrefix, releaseBlocks } = extractLeadingReleaseBlocks(prefix)
  const placeholderRegex = new RegExp(`\\n?${escapeRegex(MONOREPO_PLACEHOLDER)}\\n?`, "g")

  const cleanedMonorepoBody = monorepoBody.replace(placeholderRegex, "\n").replace(/^\s+|\s+$/g, "")

  const monorepoSections = []

  if (releaseBlocks) {
    monorepoSections.push(releaseBlocks)
  }

  if (cleanedMonorepoBody) {
    monorepoSections.push(cleanedMonorepoBody)
  }

  const normalizedMonorepoBody =
    monorepoSections.length > 0
      ? `${monorepoSections.join("\n\n")}\n\n`
      : `${MONOREPO_PLACEHOLDER}\n\n`

  const nextContent = `${cleanedPrefix}${MONOREPO_HEADING}\n\n${normalizedMonorepoBody}${legacyAndAfter}`
  return { changed: nextContent !== content, nextContent }
}

async function main() {
  const entries = await fs.readdir(packagesDir, { withFileTypes: true })
  let changedFiles = 0

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue
    }

    const changelogPath = path.join(packagesDir, entry.name, "CHANGELOG.md")

    try {
      const original = await fs.readFile(changelogPath, "utf8")
      const { changed, nextContent } = normalizeChangelogContent(original)

      if (changed) {
        await fs.writeFile(changelogPath, nextContent, "utf8")
        changedFiles += 1
      }
    } catch (error) {
      if (error && error.code === "ENOENT") {
        continue
      }

      throw error
    }
  }

  if (changedFiles > 0) {
    console.log(`Normalized changelogs: ${changedFiles}`)
  } else {
    console.log("Normalized changelogs: 0")
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
