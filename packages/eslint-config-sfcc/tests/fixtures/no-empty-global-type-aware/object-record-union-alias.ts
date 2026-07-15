export {}

type CustomerValue = Record<string, unknown> | { sample: true }

const customer: CustomerValue =
  Math.random() > 0.5 ? { sample: true } : ({ other: 1 } as Record<string, unknown>)

empty(customer)
