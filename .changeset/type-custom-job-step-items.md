---
"@commerce-klaus/typescript-sfcc": minor
---

Allow projects to augment `SfccJobSteps.ChunkStepTypes` with read and processed
item types so generated chunk job function signatures preserve application data
through `read`, `process`, and `write`. Custom API schemas with typed
`additionalProperties` now generate records with the declared value type. Type
sync also corrects the upstream `CSVStreamWriter.writeNext` declaration to
accept a single string array as documented by the Script API.
