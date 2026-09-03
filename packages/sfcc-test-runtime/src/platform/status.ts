import { createJobContext, createList, type SfccJobContext, type SfccList } from "./collections.js"

export interface SfccStatusItem {
  code: string | null
  readonly details: SfccJobContext
  readonly error: boolean
  message: string | null
  parameters: SfccList<string>
  status: number
  addDetail(key: string, value: unknown): void
  getCode(): string | null
  getDetails(): SfccJobContext
  getMessage(): string | null
  getParameters(): SfccList<string>
  getStatus(): number
  isError(): boolean
  setCode(code: string): void
  setMessage(message: string): void
  setParameters(...parameters: string[]): void
  setStatus(status: number): void
}

export interface SfccStatus {
  readonly code: string | null
  readonly details: SfccJobContext
  readonly error: boolean
  readonly items: SfccList<SfccStatusItem>
  readonly message: string | null
  readonly parameters: SfccList<string>
  readonly status: number
  addDetail(key: string, value: unknown): void
  addItem(item: SfccStatusItem): void
  getCode(): string | null
  getDetail(key: string): unknown
  getDetails(): SfccJobContext
  getItems(): SfccList<SfccStatusItem>
  getMessage(): string | null
  getParameters(): SfccList<string>
  getStatus(): number
  isError(): boolean
}

export class StatusItem implements SfccStatusItem {
  code: string | null
  readonly details = createJobContext({})
  message: string | null
  parameters: SfccList<string>
  status: number

  constructor(status = Status.OK, code?: string, message?: string, ...parameters: string[]) {
    this.status = status
    this.code = code ?? null
    this.message = message ?? null
    this.parameters = createList(parameters)
  }

  get error(): boolean {
    return this.isError()
  }

  addDetail(key: string, value: unknown): void {
    this.details.put(key, value)
  }

  getCode(): string | null {
    return this.code
  }

  getDetails(): SfccJobContext {
    return this.details
  }

  getMessage(): string | null {
    return this.message
  }

  getParameters(): SfccList<string> {
    return this.parameters
  }

  getStatus(): number {
    return this.status
  }

  isError(): boolean {
    return this.status === Status.ERROR
  }

  setCode(code: string): void {
    this.code = code
  }

  setMessage(message: string): void {
    this.message = message
  }

  setParameters(...parameters: string[]): void {
    this.parameters = createList(parameters)
  }

  setStatus(status: number): void {
    this.status = status
  }
}

export class Status implements SfccStatus {
  static readonly OK = 0
  static readonly ERROR = 1

  readonly items: SfccList<SfccStatusItem>
  private readonly itemValues: SfccStatusItem[] = []
  private readonly emptyDetails = createJobContext({})
  private readonly emptyParameters = createList<string>([])

  constructor(status = Status.OK, code?: string, message?: string, ...parameters: string[]) {
    if (arguments.length > 0) {
      this.itemValues.push(new StatusItem(status, code, message, ...parameters))
    }
    this.items = createList(this.itemValues)
  }

  private get selectedItem(): SfccStatusItem | undefined {
    return this.itemValues.find((item) => item.isError()) ?? this.itemValues[0]
  }

  get code(): string | null {
    return this.selectedItem?.getCode() ?? null
  }

  get details(): SfccJobContext {
    return this.selectedItem?.getDetails() ?? this.emptyDetails
  }

  get error(): boolean {
    return this.isError()
  }

  get message(): string | null {
    return this.selectedItem?.getMessage() ?? null
  }

  get parameters(): SfccList<string> {
    return this.selectedItem?.getParameters() ?? this.emptyParameters
  }

  get status(): number {
    return this.isError() ? Status.ERROR : Status.OK
  }

  addDetail(key: string, value: unknown): void {
    this.selectedItem?.addDetail(key, value)
  }

  addItem(item: SfccStatusItem): void {
    this.itemValues.push(item)
  }

  getCode(): string | null {
    return this.code
  }

  getDetail(key: string): unknown {
    return this.details.get(key)
  }

  getDetails(): SfccJobContext {
    return this.details
  }

  getItems(): SfccList<SfccStatusItem> {
    return this.items
  }

  getMessage(): string | null {
    return this.message
  }

  getParameters(): SfccList<string> {
    return this.parameters
  }

  getStatus(): number {
    return this.status
  }

  isError(): boolean {
    return this.itemValues.some((item) => item.isError())
  }
}
