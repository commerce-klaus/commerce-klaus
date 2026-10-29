import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { expect, test } from "vite-plus/test"

import {
  findSfccAttributeDefinition,
  getSfccAttributeEmptySemantics,
  readSfccObjectMetadata,
} from "../src/object-metadata.ts"

function withTempDir(run) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sfcc-object-metadata-test-"))

  try {
    return run(tempDir)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

test("reads normalized system and custom object attributes", () => {
  withTempDir((cwd) => {
    const metaDirectory = path.join(cwd, "sites", "site_template", "meta")
    fs.mkdirSync(metaDirectory, { recursive: true })
    fs.writeFileSync(
      path.join(metaDirectory, "object-types.xml"),
      [
        '<metadata xmlns="http://www.demandware.com/xml/impex/metadata/2006-10-31">',
        '  <type-extension type-id="SitePreferences">',
        "    <custom-attribute-definitions>",
        '      <attribute-definition attribute-id="headline">',
        "        <type>string</type>",
        "      </attribute-definition>",
        '      <attribute-definition attribute-id="threshold">',
        "        <type>double</type>",
        "      </attribute-definition>",
        '      <attribute-definition attribute-id="channels">',
        "        <type>set-of-string</type>",
        "      </attribute-definition>",
        "    </custom-attribute-definitions>",
        "  </type-extension>",
        '  <custom-type type-id="SampleRecord">',
        "    <attribute-definitions>",
        '      <attribute-definition attribute-id="enabled">',
        "        <type>boolean</type>",
        "      </attribute-definition>",
        "    </attribute-definitions>",
        "  </custom-type>",
        "</metadata>",
      ].join("\n"),
    )

    const metadata = readSfccObjectMetadata({ cwd })

    expect(metadata.objectTypes.map(({ kind, typeId }) => ({ kind, typeId }))).toEqual([
      { kind: "system", typeId: "SitePreferences" },
      { kind: "custom", typeId: "SampleRecord" },
    ])
    expect(
      getSfccAttributeEmptySemantics(
        findSfccAttributeDefinition(metadata, "SitePreferences", "headline"),
      ),
    ).toBe("length")
    expect(
      getSfccAttributeEmptySemantics(
        findSfccAttributeDefinition(metadata, "SitePreferences", "threshold"),
      ),
    ).toBe("nullish-only")
    expect(
      getSfccAttributeEmptySemantics(
        findSfccAttributeDefinition(metadata, "SitePreferences", "channels"),
      ),
    ).toBe("length")
  })
})

test("returns no metadata when the site template is absent", () => {
  withTempDir((cwd) => {
    expect(readSfccObjectMetadata({ cwd })).toEqual({
      sourceFiles: [],
      objectTypes: [],
    })
  })
})

test("does not resolve conflicting definitions for one attribute", () => {
  const metadata = {
    sourceFiles: ["first.xml", "second.xml"],
    objectTypes: [
      {
        kind: "system",
        typeId: "Product",
        sourceFile: "first.xml",
        attributes: [
          {
            id: "sample",
            type: "string",
            mandatory: false,
            selectMultiple: false,
            values: [],
          },
        ],
      },
      {
        kind: "system",
        typeId: "Product",
        sourceFile: "second.xml",
        attributes: [
          {
            id: "sample",
            type: "double",
            mandatory: false,
            selectMultiple: false,
            values: [],
          },
        ],
      },
    ],
  }

  expect(findSfccAttributeDefinition(metadata, "Product", "sample")).toBeUndefined()
})
