let source = []
let multiplier = 1

exports.prepare = function (parameters) {
  source = parameters.items.slice()
  multiplier = parameters.multiplier
}

exports.count = function () {
  return source.length
}

exports.startChunk = function (parameters, stepExecution) {
  const context = stepExecution.getJobExecution().context
  context.startedChunks = (context.startedChunks || 0) + 1
}

exports.readNext = function () {
  return source.shift()
}

exports.transform = function (item) {
  return item * multiplier
}

exports.writeBatch = function (items, parameters, stepExecution) {
  const context = stepExecution.getJobExecution().context
  context.batches.push(items.toArray())
}

exports.completeChunk = function (parameters, stepExecution) {
  const context = stepExecution.getJobExecution().context
  context.chunks = (context.chunks || 0) + 1
}

exports.finish = function (successful) {
  return successful ? "OK" : "ERROR"
}
