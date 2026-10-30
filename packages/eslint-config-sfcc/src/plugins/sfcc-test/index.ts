import requireFileExtension from "../sfcc/require-file-extension.js"
import noCartridgeRequire from "./no-cartridge-require.js"
import noConcurrentRuntime from "./no-concurrent-runtime.js"
import noHoistedRuntimeMock from "./no-hoisted-runtime-mock.js"
import noProxyquire from "./no-proxyquire.js"
import noStaleRuntimeReference from "./no-stale-runtime-reference.js"
import noStaticCartridgeImport from "./no-static-cartridge-import.js"
import noTildeImportOutsideCartridge from "./no-tilde-import-outside-cartridge.js"
import preferRuntimeGlobals from "./prefer-runtime-globals.js"
import requireRuntimeCleanup from "./require-runtime-cleanup.js"
import validMockResolvedPath from "./valid-mock-resolved-path.js"

const sfccTest = {
  meta: { name: "sfcc-test" },
  rules: {
    "no-cartridge-require": noCartridgeRequire,
    "no-concurrent-runtime": noConcurrentRuntime,
    "no-hoisted-runtime-mock": noHoistedRuntimeMock,
    "no-proxyquire": noProxyquire,
    "no-static-cartridge-import": noStaticCartridgeImport,
    "no-stale-runtime-reference": noStaleRuntimeReference,
    "no-tilde-import-outside-cartridge": noTildeImportOutsideCartridge,
    "prefer-runtime-globals": preferRuntimeGlobals,
    "require-runtime-cleanup": requireRuntimeCleanup,
    "valid-mock-resolved-path": validMockResolvedPath,
    "require-file-extension": requireFileExtension,
  },
}

export default sfccTest
