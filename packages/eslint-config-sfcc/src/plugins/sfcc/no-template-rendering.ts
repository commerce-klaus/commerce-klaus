import type { Rule } from "eslint"

import { createIsmlRenderingListeners } from "../_utils/isml-rendering.js"

const noTemplateRendering: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow SFCC template rendering modules.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc/no-template-rendering",
      recommended: false,
    },
    schema: [],
    messages: {
      templateModule: 'The template module "{{modulePath}}" is not allowed by this project.',
    },
  },
  create(context) {
    return createIsmlRenderingListeners(context, { templateModule: true })
  },
}

export default noTemplateRendering
