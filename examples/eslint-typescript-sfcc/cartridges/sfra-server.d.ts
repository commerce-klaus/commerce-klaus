declare module "server" {
  type Next = () => void

  interface Response {
    getViewData(): Record<string, unknown>
    json(data: Record<string, unknown>): void
    render(template: string, data?: Record<string, unknown>): void
    setViewData(data: Record<string, unknown>): void
  }

  type Middleware = (request: object, response: Response, next: Next) => void

  export function append(name: string, ...middleware: Middleware[]): void
  export function exports(): object
  export function extend(controller: object): void
  export function get(name: string, ...middleware: Middleware[]): void
  export function prepend(name: string, ...middleware: Middleware[]): void
  export function replace(name: string, ...middleware: Middleware[]): void
}
