import { beforeEach, describe, expect, it } from "vite-plus/test"

import { createSfccTestRuntime, type SfccTestRuntime } from "../src/index.js"

interface RestResponse {
  custom?: Record<string, unknown>
  render(): void
}

interface RestResponseManager {
  createEmptySuccess(statusCode: number): RestResponse
  createError(
    statusCode: number,
    type?: string,
    title?: string | null,
    detail?: string | null,
  ): RestResponse
  createSuccess(body: unknown, statusCode?: number): RestResponse
}

describe("SFCC Custom API harness", () => {
  let runtime: SfccTestRuntime
  let responseManager: RestResponseManager

  beforeEach(() => {
    runtime = createSfccTestRuntime()
    responseManager = runtime.resolve("dw/system/RESTResponseMgr") as RestResponseManager
  })

  it("provides request values and captures a success response", async () => {
    const api = {
      execute: () => {
        const request = Reflect.get(globalThis, "request") as {
          getSCAPIPathParameters(): { get(name: string): unknown }
          httpHeaders: { get(name: string): { stringValue: string | null } }
          httpParameterMap: {
            get(name: string): {
              booleanValue: boolean
              empty: boolean
              intValue: number
              stringValue: string | null
            }
            requestBodyAsString: string | null
          }
        }
        const response = Reflect.get(globalThis, "response") as {
          setExpires(value: number): void
          setHttpHeader(name: string, value: string): void
        }

        response.setExpires(1234)
        response.setHttpHeader("x-test", "custom-api")
        responseManager
          .createSuccess(
            {
              body: JSON.parse(request.httpParameterMap.requestBodyAsString ?? "{}"),
              enabled: request.httpParameterMap.get("enabled").booleanValue,
              limit: request.httpParameterMap.get("limit").intValue,
              missing: request.httpParameterMap.get("missing").empty,
              productId: request.getSCAPIPathParameters().get("productId"),
              token: request.httpHeaders.get("Authorization").stringValue,
            },
            201,
          )
          .render()
        return "operation-result"
      },
    }

    const result = await runtime.customApi(api).invoke("execute", {
      body: { name: "Sample" },
      headers: { authorization: "Bearer token" },
      pathParameters: { productId: "sample-product" },
      queryParameters: { enabled: true, limit: "25" },
    })

    expect(result.returnValue).toBe("operation-result")
    expect(result.response).toEqual({
      body: {
        body: { name: "Sample" },
        enabled: true,
        limit: 25,
        missing: true,
        productId: "sample-product",
        token: "Bearer token",
      },
      expires: 1234,
      headers: { "x-test": "custom-api" },
      kind: "success",
      statusCode: 201,
    })
  })

  it("captures RFC 9457 error fields and custom attributes", async () => {
    const api = {
      execute: () => {
        const response = responseManager.createError(
          422,
          "invalid-order",
          "Invalid order",
          "The order cannot be processed.",
        )
        if (response.custom) {
          response.custom.orderNo = "00001"
        }
        response.render()
      },
    }

    const result = await runtime.customApi(api).invoke("execute")

    expect(result.response).toEqual({
      custom: { orderNo: "00001" },
      detail: "The order cannot be processed.",
      expires: null,
      headers: {},
      kind: "error",
      statusCode: 422,
      title: "Invalid order",
      type: "invalid-order",
    })
  })

  it("supports empty success responses and default guest context", async () => {
    const api = {
      execute: () => {
        expect(Reflect.get(globalThis, "customer")).toEqual({
          authenticated: false,
          profile: null,
          registered: false,
        })
        responseManager.createEmptySuccess(204).render()
      },
    }

    const result = await runtime.customApi(api).invoke("execute")

    expect(result.response).toMatchObject({
      body: undefined,
      kind: "success",
      statusCode: 204,
    })
  })

  it("accepts custom globals and request extensions", async () => {
    const api = {
      execute: () => {
        const request = Reflect.get(globalThis, "request") as { locale: string }
        responseManager
          .createSuccess({
            locale: request.locale,
            organization: Reflect.get(globalThis, "organization"),
          })
          .render()
      },
    }

    const result = await runtime.customApi(api).invoke("execute", {
      globals: { organization: { ID: "org" } },
      request: { locale: "de-DE" },
    })

    expect(result.response).toMatchObject({
      body: { locale: "de-DE", organization: { ID: "org" } },
    })
  })

  it("rejects missing operations and operations without a rendered response", async () => {
    const harness = runtime.customApi({ silent: () => undefined })

    await expect(harness.invoke("missing")).rejects.toThrow(
      "SFCC Custom API does not export operation missing.",
    )
    await expect(harness.invoke("silent")).rejects.toThrow(
      "SFCC Custom API operation silent did not render a REST response.",
    )
  })

  it("rejects invalid status codes and multiple rendered responses", async () => {
    await expect(
      runtime
        .customApi({
          invalid: () => responseManager.createSuccess({}, 400),
        })
        .invoke("invalid"),
    ).rejects.toThrow(/between 100 and 299/u)

    await expect(
      runtime
        .customApi({
          duplicate: () => {
            responseManager.createSuccess({ first: true }).render()
            responseManager.createSuccess({ second: true }).render()
          },
        })
        .invoke("duplicate"),
    ).rejects.toThrow("rendered more than one REST response")
  })

  it("rejects concurrent invocations on one runtime", async () => {
    let releaseOperation!: () => void
    const operationPending = new Promise<void>((resolve) => {
      releaseOperation = resolve
    })
    const harness = runtime.customApi({
      execute: async () => {
        await operationPending
        responseManager.createEmptySuccess(204).render()
      },
    })

    const firstInvocation = harness.invoke("execute")

    await expect(harness.invoke("execute")).rejects.toThrow(
      "SFCC Custom API harness does not support concurrent invocations.",
    )

    releaseOperation()
    await expect(firstInvocation).resolves.toMatchObject({
      response: { kind: "success", statusCode: 204 },
    })
  })
})
