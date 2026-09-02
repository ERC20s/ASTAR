'use strict'

/**
 * Generation entry point — `npm run sample`.
 * Loads a checkpoint written by train.js and prints text from it.
 */

const fs = require('fs')
const path = require('path')

const { parseArgs } = require('./args')
const { MLPLanguageModel } = require('./model')

const DEFAULTS = {
  checkpoint: path.join(__dirname, '..', 'checkpoints', 'baseline.json'),
  length: 400,
  temperature: 0.9,
  prompt: '',
  seed: 7
}

function loadCheckpoint(checkpointPath) {
  const resolved = path.resolve(checkpointPath)
  if (!fs.existsSync(resolved)) {
    throw new Error('No checkpoint at ' + resolved + '. Run `npm run train` first.')
  }
  const json = JSON.parse(fs.readFileSync(resolved, 'utf8'))
  if (json.format !== 'astar-mlp-lm/1') {
    throw new Error('Unsupported checkpoint format: ' + json.format)
  }
  const model = MLPLanguageModel.fromJSON(json)
  const itos = json.vocab || []
  /** @type {Record<string, number>} */
  const stoi = {}
  for (let i = 0; i < itos.length; i++) stoi[itos[i]] = i
  return { model, vocab: { itos, stoi } }
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
  const { model, vocab } = loadCheckpoint(String(opts.checkpoint))
  console.log(
    model.generate(vocab, {
      length: opts.length,
      temperature: opts.temperature,
      prompt: String(opts.prompt),
      seed: opts.seed
    })
  )
}

if (require.main === module) main()

module.exports = { loadCheckpoint }
