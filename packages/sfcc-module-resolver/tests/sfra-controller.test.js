import { expect, test } from "vite-plus/test"

import { parseSfraController } from "../src/sfra-controller.ts"

test("parseSfraController captures inheritance and middleware labels", () => {
  const controller = parseSfraController(
    "/project/cartridges/app_custom/cartridge/controllers/Product.js",
    [
      'const server = require("server")',
      "server.extend(module.superModule)",
      'server.prepend("Show", csrfProtection.validateAjaxRequest, authorizeCustomer)',
      'server.append("Show", function enrichLoyalty() {})',
      'server.replace("Recommendations", function () {})',
    ].join("\n"),
  )

  expect(controller).toMatchObject({
    extendsSuperModule: true,
    name: "Product",
    routes: [
      {
        action: "prepend",
        middleware: ["csrfProtection.validateAjaxRequest", "authorizeCustomer"],
        name: "Show",
      },
      { action: "append", middleware: ["enrichLoyalty"], name: "Show" },
      {
        action: "replace",
        middleware: ["replace middleware 1"],
        name: "Recommendations",
      },
    ],
  })
})
