import type {
  SfccCustomerGlobal,
  SfccGlobals,
  SfccRequestGlobal,
  SfccResponseGlobal,
} from "../runtime/globals.js"

export type SfccCustomApiModule = Record<string, unknown>
export type SfccCustomApiParameters = Record<string, unknown>

export interface SfccCustomApiHttpParameter {
  readonly booleanValue: boolean
  readonly doubleValue: number
  readonly empty: boolean
  readonly intValue: number
  readonly stringValue: string | null
  readonly stringValues: string[]
}

export interface SfccCustomApiHttpParameterMap {
  readonly [name: string]: unknown
  get(name: string): SfccCustomApiHttpParameter
  readonly requestBodyAsString: string | null
}

export interface SfccCustomApiRequest extends SfccRequestGlobal {
  getSCAPIPathParameters(): {
    get(name: string): unknown
  }
  httpHeaders: {
    get(name: string): SfccCustomApiHttpParameter
  }
  httpParameterMap: SfccCustomApiHttpParameterMap
}

export interface SfccCustomApiResponseContext extends SfccResponseGlobal {
  expires: number | null
  readonly headers: Record<string, string>
  setExpires(value: number): void
  setHttpHeader(name: string, value: string): void
}

interface SfccCustomApiResponseBase {
  readonly expires: number | null
  readonly headers: Record<string, string>
  readonly statusCode: number
}

export interface SfccCustomApiSuccessResponse extends SfccCustomApiResponseBase {
  readonly body: unknown
  readonly kind: "success"
}

export interface SfccCustomApiErrorResponse extends SfccCustomApiResponseBase {
  readonly custom: Record<string, unknown>
  readonly detail: string | null
  readonly kind: "error"
  readonly title: string | null
  readonly type: string
}

export type SfccCustomApiResponse = SfccCustomApiSuccessResponse | SfccCustomApiErrorResponse

export interface SfccCustomApiInvocation {
  readonly request: SfccCustomApiRequest
  readonly response: SfccCustomApiResponse
  readonly returnValue: unknown
}

export interface SfccCustomApiInvokeOptions {
  body?: unknown
  customer?: SfccCustomerGlobal
  globals?: SfccGlobals
  headers?: SfccCustomApiParameters
  pathParameters?: SfccCustomApiParameters
  queryParameters?: SfccCustomApiParameters
  request?: Record<string, unknown>
  response?: Record<string, unknown>
}

export interface SfccCustomApiHarness {
  invoke(
    operationName: string,
    options?: SfccCustomApiInvokeOptions,
  ): Promise<SfccCustomApiInvocation>
}

interface RenderableResponse {
  custom?: Record<string, unknown>
  render(): void
}

const DEFAULT_ERROR_TYPES = new Map<number, string>([
  [400, "bad-request"],
  [401, "unauthorized"],
  [403, "forbidden"],
  [404, "resource-not-found"],
  [409, "conflict"],
  [412, "precondition-failed"],
  [429, "too-many-requests"],
  [500, "internal-server-error"],
])

function createHttpParameter(value: unknown): SfccCustomApiHttpParameter {
  const values = Array.isArray(value) ? value : value == null ? [] : [value]
  const stringValues = values.map(String)
  const stringValue = stringValues[0] ?? null
  const numericValue = stringValue === null ? Number.NaN : Number(stringValue)

  return {
    booleanValue: stringValue === "true",
    doubleValue: numericValue,
    empty: stringValues.every((item) => item.length === 0),
    intValue: Number.isNaN(numericValue) ? 0 : Math.trunc(numericValue),
    stringValue,
    stringValues,
  }
}

function createParameterMap(
  parameters: SfccCustomApiParameters,
  body: unknown,
): SfccCustomApiRequest["httpParameterMap"] {
  const entries = Object.fromEntries(
    Object.entries(parameters).map(([name, value]) => [name, createHttpParameter(value)]),
  )
  const serializedBody =
    body === undefined ? null : typeof body === "string" ? body : JSON.stringify(body)
  const requestBodyAsString = serializedBody ?? null

  return {
    ...entries,
    get: (name) => createHttpParameter(parameters[name]),
    requestBodyAsString,
  }
}

function validateStatusCode(statusCode: number, minimum: number, maximum: number): void {
  if (!Number.isInteger(statusCode) || statusCode < minimum || statusCode > maximum) {
    throw new RangeError(
      `SFCC REST response status code must be an integer between ${minimum} and ${maximum}.`,
    )
  }
}

export class CustomApiRuntime {
  private currentResponse: SfccCustomApiResponse | undefined
  private responseContext: SfccCustomApiResponseContext | undefined

  createResponseModule(): object {
    const render = (
      createResponse: (context: SfccCustomApiResponseContext) => SfccCustomApiResponse,
      custom?: Record<string, unknown>,
    ): RenderableResponse => ({
      ...(custom ? { custom } : {}),
      render: () => {
        if (!this.responseContext) {
          throw new Error(
            "SFCC REST responses can only be rendered while a Custom API operation is running.",
          )
        }
        if (this.currentResponse) {
          throw new Error("SFCC Custom API operation rendered more than one REST response.")
        }
        this.currentResponse = createResponse(this.responseContext)
      },
    })

    return {
      createEmptySuccess: (statusCode: number) => {
        validateStatusCode(statusCode, 100, 299)
        return render((context) => this.createSuccessResponse(context, undefined, statusCode))
      },
      createError: (
        statusCode: number,
        type = DEFAULT_ERROR_TYPES.get(statusCode) ?? "about:blank",
        title: string | null = null,
        detail: string | null = null,
      ) => {
        validateStatusCode(statusCode, 400, 599)
        const custom: Record<string, unknown> = {}
        return render(
          (context) => ({
            custom: { ...custom },
            detail,
            expires: context.expires,
            headers: { ...context.headers },
            kind: "error",
            statusCode,
            title,
            type,
          }),
          custom,
        )
      },
      createSuccess: (body: unknown, statusCode = 200) => {
        validateStatusCode(statusCode, 100, 299)
        return render((context) => this.createSuccessResponse(context, body, statusCode))
      },
    }
  }

  harness(
    customApiModule: SfccCustomApiModule,
    setGlobals: (globals: SfccGlobals) => void,
  ): SfccCustomApiHarness {
    return {
      invoke: async (operationName, options = {}) => {
        const operation = customApiModule[operationName]
        if (typeof operation !== "function") {
          throw new Error(`SFCC Custom API does not export operation ${operationName}.`)
        }
        if (this.responseContext) {
          throw new Error("SFCC Custom API harness does not support concurrent invocations.")
        }

        this.currentResponse = undefined
        const responseContext = this.createResponseContext()
        this.responseContext = responseContext
        const request = this.createRequest(options)
        setGlobals({
          customer: options.customer ?? {
            authenticated: false,
            profile: null,
            registered: false,
          },
          request,
          response: Object.assign(responseContext, options.response),
          ...options.globals,
        })

        try {
          const returnValue = await operation()
          if (!this.currentResponse) {
            throw new Error(
              `SFCC Custom API operation ${operationName} did not render a REST response.`,
            )
          }
          return {
            request,
            response: this.currentResponse,
            returnValue,
          }
        } finally {
          this.responseContext = undefined
        }
      },
    }
  }

  reset(): void {
    this.currentResponse = undefined
    this.responseContext = undefined
  }

  private createRequest(options: SfccCustomApiInvokeOptions): SfccCustomApiRequest {
    const pathParameters = options.pathParameters ?? {}
    const headers = Object.fromEntries(
      Object.entries(options.headers ?? {}).map(([name, value]) => [name.toLowerCase(), value]),
    )
    const request: SfccCustomApiRequest = {
      getSCAPIPathParameters: () => ({
        get: (name) => pathParameters[name] ?? null,
      }),
      httpHeaders: {
        get: (name) => createHttpParameter(headers[name.toLowerCase()]),
      },
      httpParameterMap: createParameterMap(options.queryParameters ?? {}, options.body),
    }
    return Object.assign(request, options.request)
  }

  private createResponseContext(): SfccCustomApiResponseContext {
    return {
      expires: null,
      headers: {},
      setExpires(value) {
        this.expires = value
      },
      setHttpHeader(name, value) {
        this.headers[name] = value
      },
    }
  }

  private createSuccessResponse(
    context: SfccCustomApiResponseContext,
    body: unknown,
    statusCode: number,
  ): SfccCustomApiSuccessResponse {
    return {
      body,
      expires: context.expires,
      headers: { ...context.headers },
      kind: "success",
      statusCode,
    }
  }
}
