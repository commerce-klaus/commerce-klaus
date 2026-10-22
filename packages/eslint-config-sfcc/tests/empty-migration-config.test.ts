import { ESLint } from "eslint"
import { expect, test } from "vite-plus/test"

import {
  configs,
  createEmptyMigrationConfig,
  createOxlintEmptyMigrationOverride,
  emptyMigration,
} from "../src/index.js"

test("exports the empty migration preset", () => {
  expect(configs["empty-migration"]).toBe(emptyMigration)
  expect(emptyMigration[0]?.rules).toMatchObject({
    "sfcc/no-ambiguous-empty": "error",
    "sfcc/prefer-explicit-empty-check": ["error", { autofix: true }],
  })
})

test("uses explicit file and ignore globs", () => {
  const config = createEmptyMigrationConfig({
    files: ["commerce/**/*.js"],
    ignores: ["commerce/generated/**"],
  })

  expect(config[0]?.files).toEqual(["commerce/**/*.js"])
  expect(config[0]?.ignores).toEqual(["commerce/generated/**"])
})

test("creates an equivalent Oxlint migration override", () => {
  const override = createOxlintEmptyMigrationOverride({
    files: ["commerce/**/*.js"],
    ignores: ["commerce/generated/**"],
  })

  expect(override).toEqual({
    files: ["commerce/**/*.js"],
    excludeFiles: ["commerce/generated/**"],
    rules: {
      "sfcc/no-ambiguous-empty": "error",
      "sfcc/prefer-explicit-empty-check": ["error", { autofix: true }],
    },
  })
})

test("fixes known calls and leaves ambiguous calls for review", async () => {
  const eslint = new ESLint({
    fix: true,
    overrideConfigFile: true,
    overrideConfig: createEmptyMigrationConfig({ files: ["**/*.js"] }),
  })
  const [result] = await eslint.lintText(
    ['const known = ""', "empty(known)", "empty(unknown)"].join("\n"),
    { filePath: "fixture.js" },
  )

  expect(result?.output).toBe(
    ['const known = ""', "known.length === 0", "empty(unknown)"].join("\n"),
  )
  expect(result?.messages).toHaveLength(1)
  expect(result?.messages[0]).toMatchObject({
    ruleId: "sfcc/no-ambiguous-empty",
    severity: 2,
  })
  expect(result?.messages[0]?.message).toContain("nullish, length, or SFCC collection check")
})
