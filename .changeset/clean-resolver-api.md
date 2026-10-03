---
"@commerce-klaus/sfcc-module-resolver": major
---

Split the public API into `resolution`, `hooks`, `job-steps`, `custom-apis`, and `project` entry points. The package root now exposes only the resolution API, low-level helpers used only within the package are no longer exported, and redundant `Sfcc` and resolved-state wording has been removed from public names.
