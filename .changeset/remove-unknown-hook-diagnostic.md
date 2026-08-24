---
"@commerce-klaus/typescript-sfcc": patch
---

Remove the "Unknown Salesforce hook" diagnostic. Vendored Salesforce hook declarations only cover a subset of valid `dw.*` extension points (for example `CalculateHooks` does not model `dw.order.calculateDiscounts`), so this check produced false positives for legitimate hook registrations.
