'use strict'

/**
 * Data pipeline for the ASTAR baseline language model.
 *
 * The expected input format is deliberately the simplest thing that can work:
 * ONE PLAIN UTF-8 TEXT FILE. The corpus is read as characters, every distinct
 * character becomes a token, and batches are fixed-length windows of that
 * character stream. When the group upgrades to a real tokenizer, this module is
 * the only place that has to change: `train.js` and `model.js` only ever see
 * integer ids and a vocabulary size.
 */

const fs = require('fs')
const path = require('path')

/**
 * Read a corpus from disk.
 * @param {string} filePath path to a UTF-8 text file
 * @param {number} maxChars 0 = no limit; otherwise truncate (keeps runs cheap)
 * @returns {string}
 */
function loadCorpus(filePath, maxChars = 0) {
  const resolved = path.resolve(filePath)
  if (!fs.existsSync(resolved)) {
    throw new Error(
      'Corpus not found: ' + resolved + '\nPass --data <file> or use the bundled ai/data/sample.txt'
    )
  }
  let text = fs.readFileSync(resolved, 'utf8')
  if (maxChars > 0 && text.length > maxChars) text = text.slice(0, maxChars)
  if (text.length < 64) {
    throw new Error('Corpus is too small to train on (' + text.length + ' characters, need >= 64)')
  }
  return text
}

/**
 * Build a character vocabulary.
 * @param {string} text
 * @returns {{ itos: string[], stoi: Record<string, number>, vocabSize: number }}
 */
function buildVocab(text) {
  const itos = Array.from(new Set(Array.from(text))).sort()
  /** @type {Record<string, number>} */
  const stoi = {}
  for (let i = 0; i < itos.length; i++) stoi[itos[i]] = i
  return { itos, stoi, vocabSize: itos.length }
}

/**
 * Encode text to token ids. Unknown characters are dropped.
 * @param {string} text
 * @param {Record<string, number>} stoi
 * @returns {Int32Array}
 */
function encode(text, stoi) {
  const out = new Int32Array(text.length)
  let n = 0
  for (const ch of text) {
    const id = stoi[ch]
    if (id !== undefined) out[n++] = id
  }
  return out.slice(0, n)
}

/**
 * Decode token ids back to text.
 * @param {number[]|Int32Array} ids
 * @param {string[]} itos
 * @returns {string}
 */
function decode(ids, itos) {
  let s = ''
  for (let i = 0; i < ids.length; i++) s += itos[ids[i]] || ''
  return s
}

/**
 * Split a token stream into a training and a validation part, in order (no
 * shuffling: validation must come from text the model never saw).
 * @param {Int32Array} ids
 * @param {number} valFraction between 0 and 0.5
 */
function splitTrainVal(ids, valFraction = 0.1) {
  const frac = Math.min(Math.max(valFraction, 0), 0.5)
  const cut = Math.max(1, Math.floor(ids.length * (1 - frac)))
  return { train: ids.slice(0, cut), val: ids.slice(cut) }
}

/**
 * Draw a batch of (context -> next character) examples.
 * @param {Int32Array} ids
 * @param {number} blockSize context length in tokens
 * @param {number} batchSize
 * @param {{ int: (max: number) => number }} rng
 * @returns {{ x: Int32Array, y: Int32Array, batchSize: number, blockSize: number }}
 */
function sampleBatch(ids, blockSize, batchSize, rng) {
  const usable = ids.length - blockSize - 1
  if (usable <= 0) {
    throw new Error('Split is shorter than the context window; lower --block-size or use more data')
  }
  const x = new Int32Array(batchSize * blockSize)
  const y = new Int32Array(batchSize)
  for (let b = 0; b < batchSize; b++) {
    const start = rng.int(usable)
    for (let t = 0; t < blockSize; t++) x[b * blockSize + t] = ids[start + t]
    y[b] = ids[start + blockSize]
  }
  return { x, y, batchSize, blockSize }
}

module.exports = { loadCorpus, buildVocab, encode, decode, splitTrainVal, sampleBatch }
