const RESTResponseMgr = require("dw/system/RESTResponseMgr")

function getSample() {
  const sampleId = request.getSCAPIPathParameters().get("sampleId")
  const locale = request.httpParameterMap.get("locale").stringValue

  response.setHttpHeader("x-sample", sampleId)
  RESTResponseMgr.createSuccess({ locale, sampleId }, 202).render()
}

getSample.public = true
exports.getSample = getSample
