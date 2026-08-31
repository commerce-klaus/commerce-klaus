import { expect, test } from "vite-plus/test"

import message from "../cartridges/app_custom/cartridge/scripts/message.js"

test("resolves module.superModule", () => {
  expect(message.createMessage("Commerce Klaus")).toBe("Hello, Commerce Klaus! Welcome back.")
})
