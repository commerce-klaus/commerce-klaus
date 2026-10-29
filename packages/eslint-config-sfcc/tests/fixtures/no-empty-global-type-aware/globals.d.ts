declare function empty(value: unknown): boolean

declare module "dw/object/CustomObjectMgr" {
  interface ExampleNotificationCustomAttributes {
    eventCode?: string
  }

  interface CustomObject {
    custom: Record<string, unknown>
  }

  class CustomObjectMgr {
    static getCustomObject(
      type: "ExampleNotification",
      keyValue: string,
    ): (CustomObject & { custom: ExampleNotificationCustomAttributes }) | null
    static getCustomObject(type: string, keyValue: string): CustomObject | null
  }

  export = CustomObjectMgr
}

declare module "empty-generated-contracts" {
  export type JobStepRun = (parameters: { ScheduleId?: string }) => void

  export interface RequestBody {
    email?: string
  }
}
