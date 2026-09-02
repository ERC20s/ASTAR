'use strict'

/**
 * Training entry point — `npm run train`.
 *
 * End to end and with no install step beyond what the repository already has:
 * read a text corpus, build the vocabulary, train the baseline MLP language
 * model with AdamW, report train/validation loss, write a JSON checkpoint and
 * print a short sample so a run is visibly a language model and not just a
 * number going down.
 */

const fs = require('fs')
const path = require('path')

const { parseArgs } = require('./args')
const { createRng } = require('./rng')
const { loadCorpus, buildVocab, encode, splitTrainVal, sampleBatch } = require('./data')
const { MLPLanguageModel } = require('./model')
const { AdamW, lrAt } = require('./optim')

const DEFAULTS = {
  data: path.join(__dirname, '..', 'data', 'sample.txt'),
  out: path.join(__dirname, '..', 'checkpoints', 'baseline.json'),
  steps: 400,
  batchSize: 32,
  blockSize: 8,
  embDim: 16,
  hidden: 64,
  lr: 0.05,
  weightDecay: 0.01,
  warmup: 20,
  evalEvery: 50,
  evalBatches: 8,
  valFraction: 0.1,
  maxChars: 0,
  seed: 1337,
  sample: 240,
  temperature: 0.9,
  quiet: false
}

/** Mean loss over a few random batches of a split (no gradient work). */
function evaluate(model, ids, opts, rng) {
  let total = 0
  for (let i = 0; i < opts.evalBatches; i++) {
    const batch = sampleBatch(ids, opts.blockSize, opts.batchSize, rng)
    total += model.loss(model.forward(batch.x, batch.batchSize), batch.y)
  }
  return total / opts.evalBatches
}

function train(opts, log = console.log) {
  const text = loadCorpus(opts.data, opts.maxChars)
  const vocab = buildVocab(text)
  const ids = encode(text, vocab.stoi)
  const { train: trainIds, val: valIds } = splitTrainVal(ids, opts.valFraction)

  const model = new MLPLanguageModel({
    vocabSize: vocab.vocabSize,
    blockSize: opts.blockSize,
    embDim: opts.embDim,
    hidden: opts.hidden,
    seed: opts.seed
  })
  const optimizer = new AdamW({
    params: model.params,
    lr: opts.lr,
    weightDecay: opts.weightDecay
  })
  const rng = createRng(opts.seed + 1)
  const evalRng = createRng(opts.seed + 2)

  log('corpus      : ' + opts.data)
  log('characters  : ' + text.length + ' (' + trainIds.length + ' train / ' + valIds.length + ' val tokens)')
  log('vocab size  : ' + vocab.vocabSize)
  log('parameters  : ' + model.paramCount)
  log('steps       : ' + opts.steps + ', batch ' + opts.batchSize + ', context ' + opts.blockSize)
  log('')

  const history = []
  const losses = []
  let firstLoss = null
  let lastLoss = null

  for (let step = 0; step < opts.steps; step++) {
    const batch = sampleBatch(trainIds, opts.blockSize, opts.batchSize, rng)
    const out = model.forward(batch.x, batch.batchSize)
    const loss = model.loss(out, batch.y)
    model.zeroGrad()
    model.backward(out, batch.y)
    optimizer.step(model.grads, lrAt(step, opts.steps, opts.lr, opts.warmup))

    if (!Number.isFinite(loss)) throw new Error('Loss diverged at step ' + step + '; lower --lr and retry')
    if (firstLoss === null) firstLoss = loss
    lastLoss = loss
    losses.push(loss)

    const isLast = step === opts.steps - 1
    if (opts.evalEvery > 0 && (step % opts.evalEvery === 0 || isLast)) {
      const valLoss = valIds.length > opts.blockSize + 1 ? evaluate(model, valIds, opts, evalRng) : NaN
      history.push({ step, loss, valLoss })
      log(
        'step ' + String(step).padStart(5) +
          '  train ' + loss.toFixed(4) +
          '  val ' + (Number.isFinite(valLoss) ? valLoss.toFixed(4) : 'n/a') +
          '  |g| ' + model.gradNorm().toFixed(3)
      )
    }
  }

  // single-batch losses are noisy, so runs are judged on windowed averages
  const window = Math.max(1, Math.min(10, Math.floor(losses.length / 4) || 1))
  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length
  const openingLoss = mean(losses.slice(0, window))
  const closingLoss = mean(losses.slice(-window))

  return { model, vocab, history, losses, firstLoss, lastLoss, openingLoss, closingLoss }
}

function main() {
  let opts
  try {
    opts = parseArgs(process.argv.slice(2), DEFAULTS)
  } catch (err) {
    console.error(String(err.message))
    process.exit(2)
    return
  }

  const started = Date.now()
  const result = train(opts, opts.quiet ? () => {} : console.log)
  const seconds = (Date.now() - started) / 1000

  const outPath = path.resolve(String(opts.out))
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(result.model.toJSON(result.vocab)))

  console.log('')
  console.log('opening loss: ' + result.openingLoss.toFixed(4) + ' (first batches)')
  console.log('closing loss: ' + result.closingLoss.toFixed(4) + ' (last batches)')
  console.log('uniform loss: ' + Math.log(result.vocab.vocabSize).toFixed(4) + ' (a model that learned nothing)')
  console.log('wall clock  : ' + seconds.toFixed(1) + 's')
  console.log('checkpoint  : ' + outPath)

  if (opts.sample > 0) {
    console.log('')
    console.log('--- sample ---')
    console.log(
      result.model.generate(result.vocab, {
        length: opts.sample,
        temperature: opts.temperature,
        seed: opts.seed + 3
      })
    )
  }

  if (!(result.closingLoss < result.openingLoss)) {
    console.error('')
    console.error('WARNING: the loss did not improve over this run. Try more --steps or a different --lr.')
    process.exit(1)
  }
}

if (require.main === module) main()

module.exports = { train, DEFAULTS }
