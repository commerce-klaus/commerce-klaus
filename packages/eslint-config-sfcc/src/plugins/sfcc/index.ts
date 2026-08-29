import noCustomApiAdditionalProperties from "./no-custom-api-additional-properties.js"
import noCustomApiResponseMethods from "./no-custom-api-response-methods.js"
import noDsFiles from "./no-ds-files.js"
import noE4xSyntax from "./no-e4x-syntax.js"
import noEmptyGlobal from "./no-empty-global.js"
import noRhinoImportGlobals from "./no-rhino-import-globals.js"
import noStringEquals from "./no-string-equals.js"
import noTypeAnnotations from "./no-type-annotations.js"
import preferConst from "./prefer-const.js"
import rhinoConstCompat from "./rhino-const-compat.js"
import rhinoConstConflict from "./rhino-const-conflict.js"
import validCustomApiDirName from "./valid-custom-api-dir-name.js"
import validCustomApiExport from "./valid-custom-api-export.js"
import validHookExport from "./valid-hook-export.js"
import validRequirePath from "./valid-require-path.js"

const sfcc = {
  meta: {
    name: "sfcc",
  },
  rules: {
    "no-custom-api-additional-properties": noCustomApiAdditionalProperties,
    "no-custom-api-response-methods": noCustomApiResponseMethods,
    "no-ds-files": noDsFiles,
    "no-empty-global": noEmptyGlobal,
    "no-e4x-syntax": noE4xSyntax,
    "no-type-annotations": noTypeAnnotations,
    "no-rhino-import-globals": noRhinoImportGlobals,
    "no-string-equals": noStringEquals,
    "prefer-const": preferConst,
    "rhino-const-compat": rhinoConstCompat,
    "rhino-const-conflict": rhinoConstConflict,
    "valid-custom-api-dir-name": validCustomApiDirName,
    "valid-custom-api-export": validCustomApiExport,
    "valid-hook-export": validHookExport,
    "valid-require-path": validRequirePath,
  },
}

export default sfcc
