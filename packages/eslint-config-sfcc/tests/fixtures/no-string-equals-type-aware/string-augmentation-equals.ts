export {}

declare global {
  interface String {
    equals(other: string): boolean
  }
}

const value = "abc"

value.equals("123")
