import type {
  ResolvedStepTypeDefinition,
  StepTypeExecutionMetadata,
  StepTypeParameterDefinition,
} from "@commerce-klaus/sfcc-module-resolver"

import {
  createSfccTestRuntime,
  getSfccTestRuntime,
  setSfccTestRuntime,
  type SfccArrayList,
  type SfccCalendar,
  type SfccController,
  type SfccControllerHarness,
  type SfccControllerMiddleware,
  type SfccControllerNext,
  type SfccControllerRequest,
  type SfccControllerResponse,
  type SfccControllerRoute,
  type SfccCollection,
  type SfccChunkItems,
  type SfccChunkStepFunctions,
  type SfccChunkStepResult,
  type SfccChunkStepRunOptions,
  type SfccGlobals,
  type SfccHashMap,
  type SfccJobContext,
  type SfccJobExecution,
  type SfccIterator,
  type SfccJobStepExecution,
  type SfccJobStepHarness,
  type SfccJobStepHarnessOptions,
  type SfccJobStepModule,
  type SfccJobStepParameters,
  type SfccList,
  type SfccMapEntry,
  type SfccStatus,
  type SfccStatusItem,
  type SfccStringUtils,
  type SfccTestRuntime,
  type SfccTestRuntimeOptions,
} from "@commerce-klaus/sfcc-test-runtime"

export function getSfccRuntime(): SfccTestRuntime {
  return getSfccTestRuntime()
}

export function resetSfccRuntime(options?: SfccTestRuntimeOptions): SfccTestRuntime {
  const runtime = createSfccTestRuntime(options)
  setSfccTestRuntime(runtime)
  return runtime
}

export { loadSfccJobStep, type SfccLoadedJobStep } from "./job-step.js"
export { default } from "./plugin.js"
export type { SfccVitestOptions, SfccVitestPlugin } from "./plugin.js"

export type {
  ResolvedStepTypeDefinition,
  StepTypeExecutionMetadata,
  StepTypeParameterDefinition,
  SfccArrayList,
  SfccCalendar,
  SfccController,
  SfccControllerHarness,
  SfccControllerMiddleware,
  SfccControllerNext,
  SfccControllerRequest,
  SfccControllerResponse,
  SfccControllerRoute,
  SfccCollection,
  SfccChunkItems,
  SfccChunkStepFunctions,
  SfccChunkStepResult,
  SfccChunkStepRunOptions,
  SfccGlobals,
  SfccHashMap,
  SfccJobContext,
  SfccJobExecution,
  SfccIterator,
  SfccJobStepExecution,
  SfccJobStepHarness,
  SfccJobStepHarnessOptions,
  SfccJobStepModule,
  SfccJobStepParameters,
  SfccList,
  SfccMapEntry,
  SfccStatus,
  SfccStatusItem,
  SfccStringUtils,
  SfccTestRuntime,
  SfccTestRuntimeOptions,
}
