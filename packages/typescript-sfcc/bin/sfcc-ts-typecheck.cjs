#!/usr/bin/env node

void import("../dist/typecheck-cartridges.cjs")
  .then(({ main }) => {
    process.exitCode = main(process.argv.slice(2))
  })
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
