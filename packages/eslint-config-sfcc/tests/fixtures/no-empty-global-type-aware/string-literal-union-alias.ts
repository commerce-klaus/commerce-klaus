export {}

type CustomerValue = "" | "abc"

const customer: CustomerValue = Math.random() > 0.5 ? "" : "abc"

empty(customer)
