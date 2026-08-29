---
"@commerce-klaus/eslint-config-sfcc": minor
---

Add `sfcc/valid-custom-api-export` rule. It requires a static CommonJS export marked `public = true` for each [Custom API](https://developer.salesforce.com/docs/commerce/commerce-api/guide/custom-apis.html) endpoint mapped to a script file in the rest-apis `api.json`, surfacing missing or non-public endpoint exports directly through ESLint.
