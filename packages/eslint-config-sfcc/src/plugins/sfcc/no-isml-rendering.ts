import type { Rule } from "eslint"

import { createIsmlRenderingListeners } from "../_utils/isml-rendering.js"

const noIsmlRendering: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow server-side ISML and template rendering.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc/no-isml-rendering",
      recommended: false,
    },
    schema: [],
    messages: {
      templateModule: 'The template module "{{modulePath}}" is not allowed by this project.',
      responseRender:
        "Rendering ISML through the storefront response is not allowed by this project.",
    },
  },
  create(context) {
    return createIsmlRenderingListeners(context, {
      responseRender: true,
      templateModule: true,
    })
  },
}

export default noIsmlRendering
