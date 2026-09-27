import { expect, test } from "vite-plus/test"

import { recommended } from "../src/index.js"
import { lintText } from "./test-utils.js"

const filename = "cartridges/app_custom/steptypes.json"

test("configures the JSON parser for cartridge step type files", () => {
  expect(recommended.at(-1)).toMatchObject({
    files: ["cartridges/*/steptypes.json"],
    languageOptions: {
      parser: expect.any(Object),
    },
    rules: {
      "sfcc/valid-step-type-definition": "error",
    },
  })
})

function lint(document: unknown) {
  return lintText(recommended, JSON.stringify(document, null, 2), filename)
}

test("reports an invalid job step definition at its JSON entry", async () => {
  const messages = await lint({
    "step-types": {
      "script-module-step": [
        {
          "@type-id": "custom.Valid",
          module: "app_custom/cartridge/scripts/jobs/valid",
        },
        {
          "@type-id": "custom.MissingModule",
        },
      ],
    },
  })

  expect(messages).toHaveLength(1)
  expect(messages[0]).toMatchObject({
    ruleId: "sfcc/valid-step-type-definition",
    line: 8,
    message:
      "step-types.script-module-step[1]: Job step custom.MissingModule contains invalid or missing fields.",
  })
})

test("accepts valid script and chunk job step definitions", async () => {
  const messages = await lint({
    "step-types": {
      "script-module-step": [
        {
          "@type-id": "custom.Script",
          module: "app_custom/cartridge/scripts/jobs/script",
        },
      ],
      "chunk-script-module-step": [
        {
          "@type-id": "custom.Chunk",
          "chunk-size": 100,
          module: "app_custom/cartridge/scripts/jobs/chunk",
        },
      ],
    },
  })

  expect(messages).toEqual([])
})
