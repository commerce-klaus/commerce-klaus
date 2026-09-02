export interface SfccStringUtils {
  decodeBase64(value: string): string
  encodeBase64(value: string): string
  format(pattern: string, ...values: unknown[]): string
}

export function createStringUtilsModule(): SfccStringUtils {
  return {
    decodeBase64: (value) => Buffer.from(value, "base64").toString("utf8"),
    encodeBase64: (value) => Buffer.from(value, "utf8").toString("base64"),
    format: (pattern, ...values) =>
      pattern.replace(/\{(\d+)\}/g, (placeholder, index: string) => {
        const valueIndex = Number(index)
        return valueIndex < values.length ? String(values[valueIndex]) : placeholder
      }),
  }
}
