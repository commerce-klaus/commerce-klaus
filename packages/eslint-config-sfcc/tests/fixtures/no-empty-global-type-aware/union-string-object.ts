export {}

type CustomerValue = string | Record<string, unknown>

const source = Math.random() > 0.5 ? "" : ({ sample: true } as Record<string, unknown>)
const customer: CustomerValue = source

empty(customer)
