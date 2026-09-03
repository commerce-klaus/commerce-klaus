export type SfccControllerRequest = Record<string, unknown>

export interface SfccControllerResponse {
  cachePeriod: number | null
  contentType: string | null
  headers: Record<string, string>
  isJson: boolean
  messageLog: string[]
  printed: string[]
  redirectStatus: number | null
  redirectUrl: string | null
  statusCode: number | null
  view: string | null
  viewData: Record<string, unknown>
  getViewData(): Record<string, unknown>
  json(data: Record<string, unknown>): void
  log(...items: unknown[]): void
  print(message: string): void
  redirect(url: string): void
  render(name: string, data?: Record<string, unknown>): void
  cacheExpiration(period: number): void
  setContentType(type: string): void
  setHttpHeader(name: string, value: string): void
  setRedirectStatus(status: number): void
  setStatusCode(code: number): void
  setViewData(data: Record<string, unknown>): void
}

export type SfccControllerNext = (error?: Error) => Promise<void>
export type SfccControllerMiddleware = (
  request: SfccControllerRequest,
  response: SfccControllerResponse,
  next: SfccControllerNext,
) => unknown

export interface SfccControllerRoute {
  method: "GET" | "POST"
  name: string
  middleware: SfccControllerMiddleware[]
}

export interface SfccController {
  __routes: Record<string, SfccControllerRoute>
  [routeName: string]: unknown
}

export interface SfccControllerHarness {
  run(routeName: string, request?: SfccControllerRequest): Promise<SfccControllerResponse>
}

export class ControllerRuntime {
  private readonly routes = new Map<string, SfccControllerRoute>()

  controller(controller: SfccController): SfccControllerHarness {
    return {
      run: async (routeName, request = {}) => {
        const route = controller.__routes[routeName]
        if (!route) {
          throw new Error(`SFCC controller does not define route ${routeName}.`)
        }

        const response = this.createResponse()
        const dispatch = async (index: number): Promise<void> => {
          if (response.redirectUrl) {
            return
          }
          const middleware = route.middleware[index]
          if (!middleware) {
            return
          }

          let nextCall: Promise<void> | undefined
          await middleware(request, response, (error) => {
            if (nextCall) {
              throw new Error(`SFCC controller route ${routeName} called next() more than once.`)
            }
            if (error) {
              response.log(error)
              nextCall = Promise.reject(error)
            } else {
              nextCall = dispatch(index + 1)
            }
            return nextCall
          })
          await nextCall
        }

        await dispatch(0)
        return response
      },
    }
  }

  createServerModule(): object {
    const validateMiddleware = (name: string, middleware: SfccControllerMiddleware[]): void => {
      if (typeof name !== "string" || middleware.some((item) => typeof item !== "function")) {
        throw new Error("SFCC server routes require a name followed by middleware functions.")
      }
    }
    const requireRoute = (name: string): SfccControllerRoute => {
      const route = this.routes.get(name)
      if (!route) {
        throw new Error(`SFCC server route ${name} does not exist.`)
      }
      return route
    }
    const register = (
      method: SfccControllerRoute["method"],
      name: string,
      middleware: SfccControllerMiddleware[],
    ): SfccControllerRoute => {
      validateMiddleware(name, middleware)
      if (this.routes.has(name)) {
        throw new Error(`SFCC server route ${name} is already registered.`)
      }

      const route = { method, name, middleware }
      this.routes.set(name, route)
      return route
    }

    return {
      append: (name: string, ...middleware: SfccControllerMiddleware[]) => {
        validateMiddleware(name, middleware)
        requireRoute(name).middleware.push(...middleware)
      },
      extend: (controller: SfccController) => {
        const routes = Object.values(controller.__routes ?? {})
        if (routes.length === 0) {
          throw new Error("SFCC server can only extend a controller with routes.")
        }
        this.routes.clear()
        for (const route of routes) {
          this.routes.set(route.name, {
            ...route,
            middleware: [...route.middleware],
          })
        }
      },
      exports: (): SfccController => {
        const routes = Object.fromEntries(this.routes)
        return { ...routes, __routes: routes }
      },
      get: (name: string, ...middleware: SfccControllerMiddleware[]) =>
        register("GET", name, middleware),
      getRoute: (name: string) => this.routes.get(name),
      post: (name: string, ...middleware: SfccControllerMiddleware[]) =>
        register("POST", name, middleware),
      prepend: (name: string, ...middleware: SfccControllerMiddleware[]) => {
        validateMiddleware(name, middleware)
        requireRoute(name).middleware.unshift(...middleware)
      },
      replace: (name: string, ...middleware: SfccControllerMiddleware[]) => {
        validateMiddleware(name, middleware)
        const route = requireRoute(name)
        this.routes.set(name, { ...route, middleware })
      },
    }
  }

  reset(): void {
    this.routes.clear()
  }

  private createResponse(): SfccControllerResponse {
    return {
      cachePeriod: null,
      contentType: null,
      headers: {},
      isJson: false,
      messageLog: [],
      printed: [],
      redirectStatus: null,
      redirectUrl: null,
      statusCode: null,
      view: null,
      viewData: {},
      getViewData() {
        return this.viewData
      },
      json(data) {
        this.isJson = true
        Object.assign(this.viewData, data)
      },
      log(...items) {
        this.messageLog.push(
          items
            .map((item) => {
              if (typeof item === "object") {
                return JSON.stringify(item)
              }
              if (typeof item === "function") {
                return item.name ? `[Function: ${item.name}]` : "[Function]"
              }
              if (typeof item === "symbol") {
                return item.description ? `Symbol(${item.description})` : "Symbol()"
              }
              if (typeof item === "undefined") {
                return "undefined"
              }
              if (typeof item === "boolean") {
                return item ? "true" : "false"
              }
              if (typeof item === "string") {
                return item
              }
              if (typeof item === "bigint") {
                return BigInt.prototype.toString.call(item)
              }
              return Number.prototype.toString.call(item)
            })
            .join(" "),
        )
      },
      print(message) {
        this.printed.push(message)
      },
      redirect(url) {
        this.redirectUrl = url
      },
      render(name, data) {
        this.view = name
        Object.assign(this.viewData, data)
      },
      cacheExpiration(period) {
        this.cachePeriod = period
      },
      setContentType(type) {
        this.contentType = type
      },
      setHttpHeader(name, value) {
        this.headers[name] = value
      },
      setRedirectStatus(status) {
        this.redirectStatus = status
      },
      setStatusCode(code) {
        this.statusCode = code
      },
      setViewData(data) {
        Object.assign(this.viewData, data)
      },
    }
  }
}
