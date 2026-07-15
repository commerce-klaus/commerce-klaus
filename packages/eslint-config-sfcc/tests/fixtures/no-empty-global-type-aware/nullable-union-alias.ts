export {}

type CustomerValue = null | undefined

const customer: CustomerValue = Math.random() > 0.5 ? null : undefined

empty(customer)
