---
"@commerce-klaus/eslint-config-sfcc": patch
---

Allow usage of JavaScript Generators

```js
const Logger = require("dw/system/Logger")

function* greet() {
  yield "Hello"
  yield "World"
}

const generator = greet()
for (const value of generator) {
  Logger.info(value)
}
```
