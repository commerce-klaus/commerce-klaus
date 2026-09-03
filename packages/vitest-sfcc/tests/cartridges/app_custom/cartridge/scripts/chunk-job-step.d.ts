import type {
  SfccChunkItems,
  SfccJobStepExecution,
  SfccJobStepParameters,
} from "@commerce-klaus/sfcc-test-runtime"

export function completeChunk(
  parameters: SfccJobStepParameters,
  stepExecution: SfccJobStepExecution,
): void
export function count(): number
export function finish(successful: boolean): "OK" | "ERROR"
export function finishStatus(
  successful: boolean,
  parameters: SfccJobStepParameters,
): { code: unknown }
export function prepare(parameters: SfccJobStepParameters): void
export function readNext(): unknown
export function startChunk(
  parameters: SfccJobStepParameters,
  stepExecution: SfccJobStepExecution,
): void
export function transform(item: unknown): unknown
export function writeBatch(
  items: SfccChunkItems,
  parameters: SfccJobStepParameters,
  stepExecution: SfccJobStepExecution,
): void
