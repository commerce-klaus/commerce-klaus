import noControllers from "./no-controllers.js"
import noCustomApiAdditionalProperties from "./no-custom-api-additional-properties.js"
import noCustomApiResponseMethods from "./no-custom-api-response-methods.js"
import noDsFiles from "./no-ds-files.js"
import noDwApi from "./no-dw-api.js"
import noE4xSyntax from "./no-e4x-syntax.js"
import noEmptyGlobal from "./no-empty-global.js"
import noForms from "./no-forms.js"
import noIsmlRendering from "./no-isml-rendering.js"
import noPageDesigner from "./no-page-designer.js"
import noPipelineApi from "./no-pipeline-api.js"
import noPlatformGlobals from "./no-platform-globals.js"
import noProprietaryModuleSyntax from "./no-proprietary-module-syntax.js"
import noRhinoExtensions from "./no-rhino-extensions.js"
import noRhinoImportGlobals from "./no-rhino-import-globals.js"
import noSfraServer from "./no-sfra-server.js"
import noStringEquals from "./no-string-equals.js"
import noTypeAnnotations from "./no-type-annotations.js"
import preferConst from "./prefer-const.js"
import preferNativeCollections from "./prefer-native-collections.js"
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
    "no-controllers": noControllers,
    "no-ds-files": noDsFiles,
    "no-dw-api": noDwApi,
    "no-empty-global": noEmptyGlobal,
    "no-e4x-syntax": noE4xSyntax,
    "no-forms": noForms,
    "no-isml-rendering": noIsmlRendering,
    "no-page-designer": noPageDesigner,
    "no-pipeline-api": noPipelineApi,
    "no-platform-globals": noPlatformGlobals,
    "no-proprietary-module-syntax": noProprietaryModuleSyntax,
    "no-rhino-extensions": noRhinoExtensions,
    "no-type-annotations": noTypeAnnotations,
    "no-rhino-import-globals": noRhinoImportGlobals,
    "no-sfra-server": noSfraServer,
    "no-string-equals": noStringEquals,
    "prefer-native-collections": preferNativeCollections,
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
