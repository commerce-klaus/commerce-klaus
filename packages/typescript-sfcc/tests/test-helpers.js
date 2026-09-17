import { test } from "vite-plus/test"

const TYPECHECK_TEST_TIMEOUT = 15_000

export function typecheckTest(name, run) {
  return test(name, run, TYPECHECK_TEST_TIMEOUT)
}
