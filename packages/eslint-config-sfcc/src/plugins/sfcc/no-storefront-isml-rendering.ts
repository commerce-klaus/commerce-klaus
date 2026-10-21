import type { Rule } from "eslint"

import { createIsmlRenderingListeners } from "../_utils/isml-rendering.js"

const noStorefrontIsmlRendering: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow rendering ISML through SFRA storefront responses.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc/no-storefront-isml-rendering",
      recommended: false,
    },
    schema: [],
    messages: {
      responseRender:
        "Rendering ISML through the storefront response is not allowed by this project.",
    },
  },
  create(context) {
    return createIsmlRenderingListeners(context, { responseRender: true })
  },
}

export default noStorefrontIsmlRendering
