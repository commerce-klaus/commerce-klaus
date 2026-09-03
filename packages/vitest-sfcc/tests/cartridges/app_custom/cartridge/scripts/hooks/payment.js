function authorize(paymentId) {
  return "custom:" + paymentId
}

exports.authorize = authorize
