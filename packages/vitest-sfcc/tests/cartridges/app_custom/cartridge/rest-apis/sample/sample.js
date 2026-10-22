const RESTResponseMgr = require("dw/system/RESTResponseMgr")

function getSample() {
  const sampleId = request.getSCAPIPathParameters().get("sampleId")
  const locale = request.httpParameterMap.get("locale").stringValue
  const invalidResponse = request.httpParameterMap.get("invalidResponse").booleanValue
  const responseStatus = request.httpParameterMap.get("responseStatus").intValue || 202

  response.setHttpHeader("x-sample", sampleId)
  RESTResponseMgr.createSuccess(
    { locale, sampleId: invalidResponse ? 42 : sampleId },
    responseStatus,
  ).render()
}

getSample.public = true
exports.getSample = getSample
