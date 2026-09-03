---
"@commerce-klaus/sfcc-module-resolver": minor
---

Add cartridge-aware discovery for hook registrations and `steptypes.json` job definitions.

The resolver now selects effective hooks and step types by cartridge priority, resolves their script modules, and exposes normalized job parameters, status codes, timeouts, descriptions, and execution capabilities for test-runner integrations.
