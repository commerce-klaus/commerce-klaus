[![NPM version][npm-image]][npm-url] [![Downloads][npm-downloads-image]][npm-url]

# @commerce-klaus/babel-plugin-sfcc-modules

> Babel plugin to handle non-standard module paths used by Salesforce Commerce Cloud (SFCC)

This package continues the original `babel-plugin-sfcc-modules` under the Commerce-Klaus organization.

Server-side code for Salesforce Commerce Cloud uses non-standard module resolution patterns:

- first matching cartridge from cartridge path

```javascript
require("*/cartridge/scripts/foo")
```

- current cartridge

```javascript
require("~/cartridge/scripts/bar")
```

Also there is a non-standard extension

```javascript
module.superModule
```

to reference the next match in cartridge path for the current module.

Node.js does not have solutions for these cases. This can cause problems when you need to run this code in a Node.js environment. The most common case should be for unit testing.

This plugin removes the pain of dealing with modules like [proxyquire](https://www.npmjs.com/package/proxyquire) or [sandboxed-module](https://www.npmjs.com/package/sandboxed-module).

## Install

```sh
pnpm add -D @commerce-klaus/babel-plugin-sfcc-modules
```

## Usage

Add to your Babel configuration:

```json
"plugins": [
  ["@commerce-klaus/babel-plugin-sfcc-modules", {
    "cartridgePath": [
      "app_brand",
      "app_core",
      "app_storefront_base"
    ],
    "basePath": "./path/to/cartridges"
  }]
]
```

## Options

| Option          | Type     | Description                                  |
| --------------- | -------- | -------------------------------------------- |
| `cartridgePath` | `Array`  | the cartridge path used for lookup           |
| `basePath`      | `string` | path to the folder containing the cartridges |

## ️️⚠️️️️⚠️⚠️ Warning ⚠️⚠️⚠️

![kitten.png](https://github.com/jenssimon/babel-plugin-sfcc-modules/raw/main/kitten.png)

You shouldn't use it for frontend code. There are better alternatives to deal with a cartridge path, [NODE_PATH](https://nodejs.org/api/modules.html#modules_loading_from_the_global_folders) and the handling of frontend assets in [sgmf-scripts](https://www.npmjs.com/package/sgmf-scripts).

In my opinion the best way to handle frontend code is to have a clean configuration of Webpack aliases.

The cartridge path concept isn't common for Node.js/frontend code. This plugin will work for it but I won't officially support it.

## License

MIT

[npm-url]: https://www.npmjs.com/package/@commerce-klaus/babel-plugin-sfcc-modules
[npm-image]: https://badgen.net/npm/v/@commerce-klaus/babel-plugin-sfcc-modules
[npm-downloads-image]: https://badgen.net/npm/dw/@commerce-klaus/babel-plugin-sfcc-modules
