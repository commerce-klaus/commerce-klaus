import { beforeEach, describe, expect, it } from "vite-plus/test"

import { createSfccTestRuntime, setSfccTestRuntime, type SfccController } from "../src/index.js"

describe("SFCC controller harness", () => {
  const runtime = createSfccTestRuntime()

  beforeEach(() => {
    runtime.reset()
    setSfccTestRuntime(runtime)
  })

  it("stops controller middleware that does not call next", async () => {
    const calls: string[] = []
    const controller: SfccController = {
      __routes: {
        Stop: {
          method: "GET",
          name: "Stop",
          middleware: [() => calls.push("stop"), () => calls.push("unreachable")],
        },
      },
    }

    await runtime.controller(controller).run("Stop")

    expect(calls).toEqual(["stop"])
  })

  it("rejects next errors without running later middleware", async () => {
    const calls: string[] = []
    const controller: SfccController = {
      __routes: {
        Failure: {
          method: "GET",
          name: "Failure",
          middleware: [
            (_request, _response, next) => next(new Error("route failed")),
            () => calls.push("unreachable"),
          ],
        },
      },
    }

    await expect(runtime.controller(controller).run("Failure")).rejects.toThrow("route failed")
    expect(calls).toEqual([])
  })

  it("rejects middleware that calls next more than once", async () => {
    const controller: SfccController = {
      __routes: {
        Duplicate: {
          method: "GET",
          name: "Duplicate",
          middleware: [
            async (_request, _response, next) => {
              await next()
              await next()
            },
          ],
        },
      },
    }

    await expect(runtime.controller(controller).run("Duplicate")).rejects.toThrow(
      /called next\(\) more than once/,
    )
  })
})
