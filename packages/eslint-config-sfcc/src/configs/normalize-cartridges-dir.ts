export function normalizeCartridgesDir(cartridgesDir: string): string {
  let end = cartridgesDir.length

  while (end > 0 && cartridgesDir.charCodeAt(end - 1) === 47) {
    end -= 1
  }

  return cartridgesDir.slice(0, end) || "/"
}
