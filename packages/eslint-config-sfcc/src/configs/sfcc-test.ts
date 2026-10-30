import type { Linter } from "eslint"

import type { SfccSettings } from "../types/sfcc-settings.js"

import sfccTestPlugin from "../plugins/sfcc-test/index.js"

export interface SfccTestConfigOptions {
  /** Test and setup files. TypeScript files require a separately configured parser. */
  files?: string[]
  ignores?: string[]
  /** Shared cartridge resolution settings, also read from commerce-klaus.config. */
  sfcc?: SfccSettings
}

export const sfccTestRules = {
  "sfcc-test/no-cartridge-require": "error",
  "sfcc-test/no-concurrent-runtime": "error",
  "sfcc-test/no-hoisted-runtime-mock": "warn",
  "sfcc-test/no-proxyquire": "warn",
  "sfcc-test/no-static-cartridge-import": "warn",
  "sfcc-test/no-tilde-import-outside-cartridge": "warn",
  "sfcc-test/prefer-runtime-globals": "warn",
  "sfcc-test/valid-mock-resolved-path": "error",
} satisfies NonNullable<Linter.Config["rules"]>

export function createSfccTestConfig(options: SfccTestConfigOptions = {}): Linter.Config[] {
  return [
    {
      name: "@commerce-klaus/eslint-config-sfcc/sfcc-test",
      files: options.files ?? ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}"],
      ...(options.ignores ? { ignores: options.ignores } : {}),
      plugins: { "sfcc-test": sfccTestPlugin },
      ...(options.sfcc ? { settings: { sfcc: options.sfcc } } : {}),
      rules: { ...sfccTestRules },
    },
  ]
}

const sfccTest: Linter.Config[] = createSfccTestConfig()

export default sfccTest
