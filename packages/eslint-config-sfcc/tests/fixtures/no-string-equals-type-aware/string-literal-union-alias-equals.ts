export {}

type CustomerNo = "abc" | "def"

const value: CustomerNo = Math.random() > 0.5 ? "abc" : "def"

value.equals("123")
