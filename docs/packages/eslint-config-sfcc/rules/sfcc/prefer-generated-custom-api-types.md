# `sfcc/prefer-generated-custom-api-types`

Require Custom API handler exports, parsed request bodies, and local success response values to use the operation types generated from `api.json` and its OAS schema.

## Why

The generated handler type connects the implementation to its operation ID. This keeps the public handler marker and future handler contract changes attached to the metadata-defined endpoint instead of a broad `Function` annotation.

## Incorrect

```js
/** @type {Function} */
function getLoyaltyInfo() {
  const result = { tier: "silver", points: 14275 }
  return RESTResponseMgr.createSuccess(result).render()
}

exports.getLoyaltyInfo = getLoyaltyInfo
```

## Correct

```js
/** @type {SfccCustomApis.Operations["getLoyaltyInfo"]["Handler"]} */
function getLoyaltyInfo() {
  const requestBody = request.httpParameterMap.requestBodyAsString

  /** @type {SfccCustomApis.Operations["getLoyaltyInfo"]["RequestBody"]} */
  const payload = JSON.parse(requestBody)

  /** @type {SfccCustomApis.Operations["getLoyaltyInfo"]["Response"]} */
  const result = { tier: "silver", points: payload.points }
  return RESTResponseMgr.createSuccess(result).render()
}

getLoyaltyInfo.public = true
exports.getLoyaltyInfo = getLoyaltyInfo
```

The rule follows the implementation mapping in the adjacent `api.json` and offers an ESLint suggestion for missing and incorrect `@type` annotations.

It also recognizes a local identifier passed to `RESTResponseMgr.createSuccess()` inside the exported handler. That declaration must use `SfccCustomApis.Operations[operationId]["Response"]`. Calls through unrelated local objects, direct object literals, nested helper functions, error responses, and calls outside the handler are ignored.

For operations with an OAS request body, the rule recognizes a local `JSON.parse()` result whose input is directly or through a local variable derived from `request.httpParameterMap.requestBodyAsString`. The declaration must use `SfccCustomApis.Operations[operationId]["RequestBody"]`. Both initialized declarations and later assignments to a local variable are supported.

The rule ignores unrelated JSON input, dynamic parsing helpers, destructured parse results, and parsing inside nested helper functions. Annotate those values explicitly when their contract is known.

The response variable can combine the generated type with local control-flow states through unions and intersections. The generated response must remain an explicit constituent:

```js
/**
@type {(SfccCustomApis.Operations["getLoyaltyInfo"]["Response"] &
  { unavailable?: false }) | { unavailable: true } | null}
*/
const result = getLoyaltyInfo()
```

Parameters and named schemas remain available for explicit annotations inside the handler. The rule does not guess which local value represents them.

## Default behavior

- ⚪ **Severity:** off by default; `error` in the `generated-types` preset
- ➖ **Auto-fix:** none
- 💡 **Editor suggestions:** add or replace the generated handler, request body, or response type
