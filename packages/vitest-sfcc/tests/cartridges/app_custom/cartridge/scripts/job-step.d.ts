import type { SfccJobStepExecution, SfccJobStepParameters } from "@commerce-klaus/sfcc-test-runtime"

export function Run(parameters: SfccJobStepParameters, stepExecution: SfccJobStepExecution): string
export function Parameters(
  parameters: SfccJobStepParameters,
  stepExecution: SfccJobStepExecution,
): SfccJobStepParameters
export function Status(
  parameters: SfccJobStepParameters,
): { code: unknown } | { getCode(): unknown }
