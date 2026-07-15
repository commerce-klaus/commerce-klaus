export {}

type MixedDep = "server" | `dw/${string}`

const dep: MixedDep =
  Math.random() > 0.5 ? "server" : `dw/${process.env.SFCC_MODULE ?? "util/HashMap"}`

function load() {
  return import(dep)
}

void load
