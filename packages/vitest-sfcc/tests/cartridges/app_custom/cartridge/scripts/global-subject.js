module.exports = function () {
  return {
    authenticated: customer.authenticated,
    empty: empty(request.querystring.value),
    locale: request.locale,
    sessionId: session.custom.id,
  }
}
