export {}

interface HasEquals {
  equals(value: string): boolean
}

const value: HasEquals = {
  equals() {
    return true
  },
}

value.equals("123")
