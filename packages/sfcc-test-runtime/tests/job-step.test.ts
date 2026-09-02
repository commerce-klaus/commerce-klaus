import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createSfccTestRuntime, setSfccTestRuntime } from "../src/index.js"

describe("SFCC job-step harness", () => {
  const runtime = createSfccTestRuntime()

  beforeEach(() => {
    runtime.reset()
    setSfccTestRuntime(runtime)
  })

  it("runs a script-module job step with parameters and execution context", async () => {
    const context = { runs: 2 }
    const jobStep = runtime.jobStep(
      {
        Run: (
          parameters: Record<string, unknown>,
          stepExecution: {
            getJobExecution: () => { context: Record<string, unknown> }
          },
        ) => {
          const jobExecution = stepExecution.getJobExecution()
          jobExecution.context.runs = Number(jobExecution.context.runs ?? 0) + 1
          return `${String(parameters.prefix)}:${String(jobExecution.context.runs)}`
        },
      },
      {
        context,
        jobExecutionId: "job-execution-1",
        jobId: "NightlyFeed",
        stepExecutionId: "step-execution-1",
        stepId: "GenerateFeed",
        stepTypeId: "custom.GenerateFeed",
      },
    )

    await expect(jobStep.run("Run", { prefix: "feed" })).resolves.toBe("feed:3")
    await expect(jobStep.run("Run", { prefix: "feed" })).resolves.toBe("feed:4")
    expect(jobStep.jobExecution.context).toBe(context)
    expect(jobStep.jobExecution.context).toEqual({ runs: 4 })
    expect(jobStep.jobExecution.context.get("runs")).toBe(4)
    expect(jobStep.jobExecution.context.containsKey("runs")).toBe(true)
    expect(jobStep.jobExecution.context.containsValue(4)).toBe(true)
    expect(jobStep.jobExecution.context.isEmpty()).toBe(false)
    expect(jobStep.jobExecution.context.size()).toBe(1)
    expect(jobStep.jobExecution.context.getLength()).toBe(1)
    expect(jobStep.jobExecution.context).toMatchObject({ empty: false, length: 1 })
    jobStep.jobExecution.context.put("fileName", "feed.xml")
    expect(jobStep.jobExecution.context.fileName).toBe("feed.xml")
    const keys = jobStep.jobExecution.context.keySet()
    const values = jobStep.jobExecution.context.values()
    const entries = jobStep.jobExecution.context.entrySet()
    expect(keys.toArray()).toEqual(["runs", "fileName"])
    expect(keys.toArray(1, 1)).toEqual(["fileName"])
    expect(keys.contains("runs")).toBe(true)
    expect(keys).toMatchObject({ empty: false, length: 2 })
    expect(keys.getLength()).toBe(2)
    expect(keys.isEmpty()).toBe(false)
    expect(keys.size()).toBe(2)
    expect([...keys]).toEqual(["runs", "fileName"])
    const keyIterator = keys.iterator()
    expect(keyIterator.hasNext()).toBe(true)
    expect(keyIterator.next()).toBe("runs")
    const remainingKeys = keyIterator.asList()
    expect(keyIterator.hasNext()).toBe(false)
    expect(remainingKeys.get(0)).toBe("fileName")
    const remainingKeyArray = remainingKeys.toArray()
    remainingKeyArray.push("independent")
    expect(remainingKeys.toArray()).toEqual(["fileName"])
    expect(values.toArray()).toEqual([4, "feed.xml"])
    expect(entries.toArray()).toEqual([
      expect.objectContaining({ key: "runs", value: 4 }),
      expect.objectContaining({ key: "fileName", value: "feed.xml" }),
    ])
    expect(entries.toArray()[0]?.getKey()).toBe("runs")
    expect(entries.toArray()[0]?.getValue()).toBe(4)
    expect(jobStep.jobExecution.context.remove("fileName")).toBe("feed.xml")
    expect(keys.toArray()).toEqual(["runs"])
    expect(values.toArray()).toEqual([4])
    expect(entries.toArray()).toHaveLength(1)
    expect(jobStep.jobExecution.context.get("fileName")).toBeNull()
    expect(jobStep.jobExecution.getContext()).toBe(jobStep.jobExecution.context)
    expect(jobStep.jobExecution.getID()).toBe("job-execution-1")
    expect(jobStep.jobExecution.getJobID()).toBe("NightlyFeed")
    expect(jobStep.jobExecution).toMatchObject({
      ID: "job-execution-1",
      jobID: "NightlyFeed",
    })
    expect(jobStep.stepExecution.getJobExecution()).toBe(jobStep.jobExecution)
    expect(jobStep.stepExecution.getID()).toBe("step-execution-1")
    expect(jobStep.stepExecution.getStepID()).toBe("GenerateFeed")
    expect(jobStep.stepExecution.getStepTypeID()).toBe("custom.GenerateFeed")
    expect(jobStep.stepExecution).toMatchObject({
      ID: "step-execution-1",
      jobExecution: jobStep.jobExecution,
      stepID: "GenerateFeed",
      stepTypeID: "custom.GenerateFeed",
    })
    expect(() => runtime.jobStep({}, { context })).not.toThrow()
    jobStep.jobExecution.context.clear()
    expect(jobStep.jobExecution.context).toMatchObject({ empty: true, length: 0 })
  })

  it("rejects a missing script-module job step function", async () => {
    const jobStep = runtime.jobStep({ execute: "not callable" })

    await expect(jobStep.run("execute")).rejects.toThrow(
      "SFCC job step does not export function execute.",
    )
  })

  it("runs a chunk job step lifecycle and filters null process results", async () => {
    const trace: string[] = []
    const source = [1, 2, 3]
    const written: number[][] = []
    const jobStep = runtime.jobStep({
      beforeStep: (parameters: Record<string, unknown>) =>
        trace.push(`beforeStep:${String(parameters.prefix)}`),
      getTotalCount: () => {
        trace.push("getTotalCount")
        return source.length
      },
      beforeChunk: () => trace.push("beforeChunk"),
      read: () => {
        const item = source.shift()
        trace.push(`read:${String(item)}`)
        return item
      },
      process: (item: number) => {
        trace.push(`process:${item}`)
        return item === 3 ? null : item * 2
      },
      write: (items: {
        get: (index: number) => number
        isEmpty: () => boolean
        size: () => number
        toArray: () => number[]
      }) => {
        expect(items.isEmpty()).toBe(false)
        expect(items.get(1)).toBe(4)
        expect(items.size()).toBe(2)
        written.push(items.toArray())
        trace.push("write")
      },
      afterChunk: () => trace.push("afterChunk"),
      afterStep: (successful: boolean) => {
        trace.push(`afterStep:${successful}`)
        return "finished"
      },
    })

    await expect(
      jobStep.runChunk({ chunkSize: 2, parameters: { prefix: "feed" } }),
    ).resolves.toEqual({
      afterStepResult: "finished",
      chunkCount: 2,
      processedCount: 2,
      readCount: 3,
      totalCount: 3,
      writtenCount: 2,
    })
    expect(written).toEqual([[2, 4]])
    expect(trace).toEqual([
      "beforeStep:feed",
      "getTotalCount",
      "beforeChunk",
      "read:1",
      "process:1",
      "read:2",
      "process:2",
      "write",
      "afterChunk",
      "beforeChunk",
      "read:3",
      "process:3",
      "read:undefined",
      "afterChunk",
      "afterStep:true",
    ])
  })

  it("runs afterStep with a failed chunk lifecycle", async () => {
    const afterStep = vi.fn()
    const jobStep = runtime.jobStep({
      read: () => "item",
      process: () => {
        throw new Error("processing failed")
      },
      write: () => undefined,
      afterStep,
    })

    await expect(jobStep.runChunk({ chunkSize: 1 })).rejects.toThrow("processing failed")
    expect(afterStep).toHaveBeenCalledWith(false, {}, jobStep.stepExecution)
  })

  it("validates chunk size and required lifecycle functions", async () => {
    await expect(runtime.jobStep({}).runChunk({ chunkSize: 0 })).rejects.toThrow(
      "SFCC chunk job step requires a positive integer chunk size.",
    )
    await expect(
      runtime.jobStep({ write: () => undefined }).runChunk({ chunkSize: 1 }),
    ).rejects.toThrow("SFCC job step does not export function read.")
    await expect(
      runtime
        .jobStep({ read: () => undefined, write: () => undefined })
        .runChunk({ chunkSize: 1, functions: { beforeStep: "prepare" } }),
    ).rejects.toThrow("SFCC job step does not export function prepare.")
    await expect(
      runtime
        .jobStep({ read: () => undefined, write: () => undefined, getTotalCount: () => "3" })
        .runChunk({ chunkSize: 1 }),
    ).rejects.toThrow("SFCC chunk job step getTotalCount() must return a non-negative number.")
  })
})
