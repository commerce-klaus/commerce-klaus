exports.Run = function (parameters, stepExecution) {
  const context = stepExecution.getJobExecution().context
  context.executions = (context.executions || 0) + 1
  return parameters.prefix + ":" + context.executions
}

exports.Parameters = function (parameters, stepExecution) {
  stepExecution.getJobExecution().context.parameters = parameters
  return parameters
}

exports.Status = function (parameters) {
  return parameters.UseGetter ? { getCode: () => parameters.Code } : { code: parameters.Code }
}

exports.Delayed = function (parameters) {
  return new Promise((resolve) => setTimeout(resolve, parameters.DelayMs))
}
