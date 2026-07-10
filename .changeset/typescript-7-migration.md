---
"@commerce-klaus/eslint-config-sfcc": patch
"@commerce-klaus/typescript-sfcc": patch
---

Migrate to TypeScript 7

TypeScript 7 ships without a programmatic API (coming in 7.1). All packages that
depend on the TypeScript compiler API now use `@typescript/typescript6` as their
`typescript` devDependency while keeping the native TS7 binary available via
`@typescript/native-preview` for faster builds. The peer dependency
`typescript: ">=5.5.0"` remains unchanged.

A patch for `eslint-plugin-sonarjs@4.1.0` is included to guard the top-level
`ts.SyntaxKind.FunctionType` access with optional chaining so the plugin loads
without crashing when the TypeScript API is unavailable.
