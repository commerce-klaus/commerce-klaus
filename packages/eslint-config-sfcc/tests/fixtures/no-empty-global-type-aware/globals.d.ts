declare function empty(value: unknown): boolean

declare module "empty-generated-contracts" {
  export type JobStepRun = (parameters: { ScheduleId?: string }) => void

  export interface RequestBody {
    email?: string
  }
}
