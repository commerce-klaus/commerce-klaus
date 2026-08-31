# ESLint and TypeScript SFCC example

This private workspace package shows the smallest recommended setup for using
`@commerce-klaus/eslint-config-sfcc` and `@commerce-klaus/typescript-sfcc`
together in an SFCC cartridge project.

The ESLint flat config combines the recommended presets from ESLint,
TypeScript ESLint, SonarJS, and Unicorn. The SFCC config is applied last so its
Rhino and CommonJS compatibility overrides take precedence. Unicorn continues
to enforce kebab-case filenames but does not check SFCC cartridge directory
names such as `app_example`.

The cartridge remains JavaScript that can run on SFCC. TypeScript checks the
JavaScript and its JSDoc annotations without emitting build artifacts.

From this directory, run:

```bash
vp run lint
vp run typecheck:cartridges
vp run test
```

Or run all checks together:

```bash
vp run build
```

The cartridge typecheck first synchronizes Salesforce script types with a
minimum version of `26.7.0`. Existing up-to-date types are reused.

The example metadata defines an `ExampleNotification` custom object with a
string `eventCode` attribute. Type synchronization generates
`CustomObjectExampleNotificationCustomAttributes` and typed `CustomObjectMgr`
overloads. The example cartridge loads the custom object with
`CustomObjectMgr.getCustomObject()` and reads the generated `eventCode`
attribute from the inferred result. Accessing an undefined attribute in the
cartridge demonstrates that `typecheck:cartridges` validates the generated
contract.

The registered `dw.order.calculate` hook uses the generated
`SfccHooks.OrderCalculate` signature. The project-local `sfcc-hooks.d.ts` adds
the Shopper API hook signature used by `shopper-product.js`, including its
custom `c_brand` response property. The typecheck also validates that scripts
registered in `hooks.json` exist and export the expected hook functions.

The `loyalty-info` Custom API combines `api.json`, an OpenAPI schema, and a
public implementation script. Type synchronization generates its operation,
parameter, and response types. ESLint validates the public endpoint export and
SFCC response API usage, while the typecheck validates the response object
against the OpenAPI contract.

The solution places `app_custom` before `app_example` in the cartridge path.
The custom cartridge overrides `greeting.js` and accesses the next matching
implementation through `module.superModule`. Its `require-examples.js` also
demonstrates the supported SFCC module patterns:

- `~/cartridge/...` resolves inside the current cartridge.
- `*/cartridge/...` resolves from the highest-priority matching cartridge.
- `app_example/cartridge/...` resolves an explicitly named cartridge.

The Vite config applies `@commerce-klaus/vite-plugin-sfcc-modules` and loads the
cartridge order from the `Example` site's `custom-cartridges` setting in the
site template. The ESLint config passes the same site template and site to the
SFCC recommended config, so `sfcc/valid-require-path` uses that cartridge order
as well. The Vitest integration test imports the custom `price-label.js`
implementation and verifies that `module.superModule` resolves and executes the
base implementation from `app_example`.

Force a refresh after changing metadata, sandbox details, or the API version
with:

```bash
vp run types:sfcc:sync:force
```

See the [`typescript-sfcc` documentation](../../packages/typescript-sfcc/README.md)
for generated type locations and additional CLI options.
