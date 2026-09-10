---
"@commerce-klaus/vitest-sfcc": minor
---

Allow automatic `hooks.json` discovery to be disabled or limited to selected cartridges with the new `hookDiscovery` plugin option. This keeps focused test projects from loading unrelated hook scripts and their platform dependencies while preserving direct runtime hook registration.
