import {
  createSfccTestRuntime,
  getSfccTestRuntime,
  requireSfccModule,
  setSfccTestRuntime,
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

export { requireSfccModule }
export type {
  LoggerEntry,
  SfccArrayList,
  SfccCalendar,
  SfccCollection,
  SfccController,
  SfccControllerHarness,
  SfccControllerMiddleware,
  SfccControllerNext,
  SfccControllerRequest,
  SfccControllerResponse,
  SfccControllerRoute,
  SfccChunkItems,
  SfccChunkStepFunctions,
  SfccChunkStepResult,
  SfccChunkStepRunOptions,
  SfccGlobals,
  SfccHashMap,
  SfccHookImplementation,
  SfccIterator,
  SfccJobContext,
  SfccJobExecution,
  SfccJobStepExecution,
  SfccJobStepHarness,
  SfccJobStepHarnessOptions,
  SfccJobStepModule,
  SfccJobStepParameters,
  SfccList,
  SfccMapEntry,
  SfccModule,
  SfccModuleFallback,
  SfccStatus,
  SfccStatusItem,
  SfccStringUtils,
  SfccTestRuntime,
  SfccTestRuntimeOptions,
} from "@commerce-klaus/sfcc-test-runtime"
