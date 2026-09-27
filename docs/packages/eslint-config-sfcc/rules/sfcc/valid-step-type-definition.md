# sfcc/valid-step-type-definition

Reports invalid job step definitions directly in cartridge `steptypes.json`
files.

## What it checks

- Requires the top-level `step-types` object and at least one supported step array
- Validates script and chunk module step fields, parameters, status codes, metadata, and function names
- Reports each invalid definition at its JSON object while allowing valid sibling definitions
- Uses the same step type parser as `b2c klaus validate`

## Default behavior

- Severity: `error`
- Files: `cartridges/*/steptypes.json`
- Auto-fix: none

## Example

```json [Invalid: steptypes.json]
{
  "step-types": {
    "script-module-step": [
      {
        "@type-id": "custom.Sample"
      }
    ]
  }
}
```

The definition is invalid because it does not declare a `module`.
