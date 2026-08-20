export {}

/** @type {"lodash"} */
const dep = "lodash"

function load() {
  return import(dep)
}

void load
