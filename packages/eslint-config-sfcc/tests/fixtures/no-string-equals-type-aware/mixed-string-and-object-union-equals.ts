export {}

interface HasEquals {
  equals(value: string): boolean
}

type MaybeString = string | HasEquals

const value: MaybeString =
  Math.random() > 0.5
    ? "abc"
    : {
        equals() {
          return true
        },
      }

value.equals("123")
