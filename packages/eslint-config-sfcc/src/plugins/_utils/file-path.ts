import type { Rule } from "eslint"

export function normalizeFilePath(filePath: string): string {
  return filePath.replaceAll("\\", "/")
}

export function createFilePathRuleListener(
  context: Rule.RuleContext,
  matches: (normalizedFilename: string) => boolean,
  messageId: string,
): Rule.RuleListener {
  return {
    Program(node) {
      if (matches(normalizeFilePath(context.filename))) {
        context.report({ node, messageId })
      }
    },
  }
}
