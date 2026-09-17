#!/usr/bin/env node

const path = require("node:path")
const packageJson = require("../package.json")

void Promise.all([import("../dist/commands.cjs"), import("@oclif/core")])
  .then(([{ TypecheckCommand }, { handle }]) => {
    return TypecheckCommand.run(process.argv.slice(2), {
      root: path.resolve(__dirname, ".."),
      pjson: {
        ...packageJson,
        oclif: { ...packageJson.oclif, bin: "sfcc-ts-typecheck" },
      },
    }).catch(handle)
  })
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
