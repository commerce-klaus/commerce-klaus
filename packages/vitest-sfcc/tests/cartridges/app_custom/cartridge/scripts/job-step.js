exports.Run = function (parameters, stepExecution) {
  const context = stepExecution.getJobExecution().context
  context.executions = (context.executions || 0) + 1
  return parameters.prefix + ":" + context.executions
}
