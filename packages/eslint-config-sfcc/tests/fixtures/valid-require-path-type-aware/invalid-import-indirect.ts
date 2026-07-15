export {}

const dep = "lodash" as const

function load() {
  return import(dep)
}

void load
