import { createJobContext, type SfccJobContext } from "../platform/collections.js"

export type SfccJobStepModule = Record<string, unknown>
export type SfccJobStepParameters = Record<string, unknown>

export interface SfccJobExecution {
  readonly ID: string
  context: SfccJobContext
  readonly jobID: string
  getContext(): SfccJobContext
  getID(): string
  getJobID(): string
}

export interface SfccJobStepExecution {
  readonly ID: string
  readonly jobExecution: SfccJobExecution
  readonly stepID: string
  readonly stepTypeID: string
  getID(): string
  getJobExecution(): SfccJobExecution
  getStepID(): string
  getStepTypeID(): string
}

export interface SfccChunkItems<Item = unknown> extends Iterable<Item> {
  readonly length: number
  get(index: number): Item
  isEmpty(): boolean
  size(): number
  toArray(): Item[]
}

export interface SfccChunkStepFunctions {
  afterChunk?: string
  afterStep?: string
  beforeChunk?: string
  beforeStep?: string
  getTotalCount?: string
  process?: string
  read?: string
  write?: string
}

export interface SfccChunkStepRunOptions {
  chunkSize: number
  functions?: SfccChunkStepFunctions
  parameters?: SfccJobStepParameters
}

export interface SfccChunkStepResult {
  afterStepResult: unknown
  chunkCount: number
  processedCount: number
  readCount: number
  totalCount: number | null
  writtenCount: number
}

export interface SfccJobStepHarness {
  readonly jobExecution: SfccJobExecution
  readonly stepExecution: SfccJobStepExecution
  run(functionName: string, parameters?: SfccJobStepParameters): Promise<unknown>
  runChunk(options: SfccChunkStepRunOptions): Promise<SfccChunkStepResult>
}

export interface SfccJobStepHarnessOptions {
  context?: Record<string, unknown>
  jobExecutionId?: string
  jobId?: string
  stepExecutionId?: string
  stepId?: string
  stepTypeId?: string
}

function createChunkItems<Item>(items: Item[]): SfccChunkItems<Item> {
  return {
    length: items.length,
    get: (index) => items[index] as Item,
    isEmpty: () => items.length === 0,
    size: () => items.length,
    toArray: () => [...items],
    [Symbol.iterator]: () => items[Symbol.iterator](),
  }
}

export function createJobStepHarness(
  jobStepModule: SfccJobStepModule,
  options: SfccJobStepHarnessOptions = {},
): SfccJobStepHarness {
  const context = createJobContext(options.context ?? {})
  const jobExecutionId = options.jobExecutionId ?? "TestJobExecution"
  const jobId = options.jobId ?? "TestJob"
  const jobExecution: SfccJobExecution = {
    ID: jobExecutionId,
    context,
    getContext: () => context,
    getID: () => jobExecutionId,
    getJobID: () => jobId,
    jobID: jobId,
  }
  const stepExecutionId = options.stepExecutionId ?? "TestStepExecution"
  const stepId = options.stepId ?? "TestStep"
  const stepTypeId = options.stepTypeId ?? "custom.TestStep"
  const stepExecution: SfccJobStepExecution = {
    ID: stepExecutionId,
    getID: () => stepExecutionId,
    getJobExecution: () => jobExecution,
    getStepID: () => stepId,
    getStepTypeID: () => stepTypeId,
    jobExecution,
    stepID: stepId,
    stepTypeID: stepTypeId,
  }
  const requireFunction = (functionName: string): ((...args: unknown[]) => unknown) => {
    const stepFunction = jobStepModule[functionName]
    if (typeof stepFunction !== "function") {
      throw new Error(`SFCC job step does not export function ${functionName}.`)
    }
    return stepFunction as (...args: unknown[]) => unknown
  }
  const optionalFunction = (
    functionName: string,
    configured: boolean,
  ): ((...args: unknown[]) => unknown) | undefined => {
    const stepFunction = jobStepModule[functionName]
    if (stepFunction === undefined) {
      if (configured) {
        throw new Error(`SFCC job step does not export function ${functionName}.`)
      }
      return undefined
    }
    return requireFunction(functionName)
  }

  return {
    jobExecution,
    stepExecution,
    run: async (functionName, parameters = {}) => {
      return requireFunction(functionName)(parameters, stepExecution)
    },
    runChunk: async ({ chunkSize, functions = {}, parameters = {} }) => {
      if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
        throw new Error("SFCC chunk job step requires a positive integer chunk size.")
      }

      const names = {
        afterChunk: functions.afterChunk ?? "afterChunk",
        afterStep: functions.afterStep ?? "afterStep",
        beforeChunk: functions.beforeChunk ?? "beforeChunk",
        beforeStep: functions.beforeStep ?? "beforeStep",
        getTotalCount: functions.getTotalCount ?? "getTotalCount",
        process: functions.process ?? "process",
        read: functions.read ?? "read",
        write: functions.write ?? "write",
      }
      const afterChunk = optionalFunction(names.afterChunk, functions.afterChunk !== undefined)
      const afterStep = optionalFunction(names.afterStep, functions.afterStep !== undefined)
      const beforeChunk = optionalFunction(names.beforeChunk, functions.beforeChunk !== undefined)
      const beforeStep = optionalFunction(names.beforeStep, functions.beforeStep !== undefined)
      const getTotalCount = optionalFunction(
        names.getTotalCount,
        functions.getTotalCount !== undefined,
      )
      const process = optionalFunction(names.process, functions.process !== undefined)
      const read = requireFunction(names.read)
      const write = requireFunction(names.write)
      const result: SfccChunkStepResult = {
        afterStepResult: undefined,
        chunkCount: 0,
        processedCount: 0,
        readCount: 0,
        totalCount: null,
        writtenCount: 0,
      }
      let successful = false

      try {
        await beforeStep?.(parameters, stepExecution)
        if (getTotalCount) {
          const totalCount = await getTotalCount(parameters, stepExecution)
          if (typeof totalCount !== "number" || !Number.isFinite(totalCount) || totalCount < 0) {
            throw new Error(
              "SFCC chunk job step getTotalCount() must return a non-negative number.",
            )
          }
          result.totalCount = totalCount
        }

        let complete = false
        while (!complete) {
          await beforeChunk?.(parameters, stepExecution)
          const processedItems: unknown[] = []
          let chunkReadCount = 0

          while (chunkReadCount < chunkSize) {
            const item = await read(parameters, stepExecution)
            if (item == null) {
              complete = true
              break
            }
            chunkReadCount += 1
            result.readCount += 1
            const processedItem = process ? await process(item, parameters, stepExecution) : item
            if (processedItem != null) {
              processedItems.push(processedItem)
              result.processedCount += 1
            }
          }

          if (chunkReadCount === 0) {
            break
          }
          if (processedItems.length > 0) {
            await write(createChunkItems(processedItems), parameters, stepExecution)
            result.writtenCount += processedItems.length
          }
          await afterChunk?.(parameters, stepExecution)
          result.chunkCount += 1
        }
        successful = true
      } finally {
        result.afterStepResult = await afterStep?.(successful, parameters, stepExecution)
      }

      return result
    },
  }
}
