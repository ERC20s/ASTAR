'use strict'

/**
 * `npm run ai:test` — the check a reviewer can run in a few seconds.
 *
 * 1. gradient check: analytic gradients match central-difference numeric ones
 * 2. the training loop actually reduces the loss on the bundled corpus
 * 3. a checkpoint round-trips: save, load, identical predictions
 *
 * Exits non-zero on the first failure, so it is usable as a CI command.
 */

const fs = require('fs')
const os = require('os')
const path = require('path')

const { createRng } = require('./rng')
const { buildVocab, encode, sampleBatch } = require('./data')
const { MLPLanguageModel } = require('./model')
const { train, DEFAULTS } = require('./train')

let failures = 0

function check(name, condition, detail) {
  if (condition) {
    console.log('ok   - ' + name + (detail ? '  (' + detail + ')' : ''))
  } else {
    failures++
    console.error('FAIL - ' + name + (detail ? '  (' + detail + ')' : ''))
  }
}

function gradientCheck() {
  const text = 'the astar model learns from characters. '.repeat(8)
  const vocab = buildVocab(text)
  const ids = encode(text, vocab.stoi)
  const rng = createRng(11)
  const model = new MLPLanguageModel({
    vocabSize: vocab.vocabSize,
    blockSize: 3,
    embDim: 4,
    hidden: 8,
    seed: 5
  })
  const batch = sampleBatch(ids, 3, 6, rng)

  const out = model.forward(batch.x, batch.batchSize)
  model.zeroGrad()
  model.backward(out, batch.y)

  // float32 storage limits how small the perturbation can usefully be, so the
  // pass condition is "absolutely close, and relatively close where the
  // gradient is large enough for a ratio to mean anything".
  const eps = 2e-3
  let worstAbs = 0
  let worstRel = 0
  for (let k = 0; k < model.params.length; k++) {
    const tensor = model.params[k].data
    const grad = model.grads[k]
    for (let trial = 0; trial < 4; trial++) {
      const i = rng.int(tensor.length)
      const original = tensor[i]
      tensor[i] = original + eps
      const up = model.loss(model.forward(batch.x, batch.batchSize), batch.y)
      tensor[i] = original - eps
      const down = model.loss(model.forward(batch.x, batch.batchSize), batch.y)
      tensor[i] = original
      const numeric = (up - down) / (2 * eps)
      const analytic = grad[i]
      const absErr = Math.abs(numeric - analytic)
      worstAbs = Math.max(worstAbs, absErr)
      const denom = Math.abs(numeric) + Math.abs(analytic)
      if (denom > 1e-2) worstRel = Math.max(worstRel, absErr / denom)
    }
  }
  check(
    'analytic gradients match numeric gradients',
    worstAbs < 2e-3 && worstRel < 0.05,
    'worst absolute ' + worstAbs.toExponential(2) + ', worst relative ' + worstRel.toFixed(4)
  )
}

function trainingReducesLoss() {
  const opts = Object.assign({}, DEFAULTS, {
    steps: 250,
    batchSize: 24,
    blockSize: 6,
    embDim: 12,
    hidden: 48,
    evalEvery: 0,
    sample: 0,
    seed: 99
  })
  const result = train(opts, () => {})
  check(
    'training reduces the loss on the bundled corpus',
    result.closingLoss < result.openingLoss * 0.9,
    'opening ' + result.openingLoss.toFixed(3) + ' -> closing ' + result.closingLoss.toFixed(3)
  )

  const uniform = Math.log(result.vocab.vocabSize)
  check(
    'closing loss beats a uniform-random predictor',
    result.closingLoss < uniform,
    'closing ' + result.closingLoss.toFixed(3) + ' vs uniform ' + uniform.toFixed(3)
  )

  const text = result.model.generate(result.vocab, { length: 64, temperature: 0.8, seed: 3 })
  check('the model generates text of the requested length', text.length === 64)

  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'astar-ai-')), 'ckpt.json')
  fs.writeFileSync(file, JSON.stringify(result.model.toJSON(result.vocab)))
  const reloaded = MLPLanguageModel.fromJSON(JSON.parse(fs.readFileSync(file, 'utf8')))
  const a = result.model.generate(result.vocab, { length: 32, temperature: 0.8, seed: 3 })
  const b = reloaded.generate(result.vocab, { length: 32, temperature: 0.8, seed: 3 })
  check('a saved checkpoint reloads to the same model', a === b)
}

console.log('ASTAR baseline model — smoke test')
console.log('')
gradientCheck()
trainingReducesLoss()
console.log('')
if (failures > 0) {
  console.error(failures + ' check(s) failed')
  process.exit(1)
}
console.log('all checks passed')
