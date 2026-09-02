'use strict'

/**
 * The ASTAR baseline model: a character-level MLP language model.
 *
 *   ids -> embedding table C -> concat context -> tanh(W1) -> logits(W2) -> softmax
 *
 * It is intentionally small and written from scratch (no framework, no native
 * dependency) so the whole group can read every line of the forward and the
 * backward pass, and so `npm run ai:test` runs anywhere Node runs. It is the
 * baseline the architecture work replaces, not the end state: the interface
 * (forward / backward / step / save / load / generate) is what later models
 * must keep.
 */

const { createRng } = require('./rng')

/** Xavier-ish scaled normal init. */
function initMatrix(rows, cols, rng, gain) {
  const a = new Float32Array(rows * cols)
  const std = gain / Math.sqrt(rows)
  for (let i = 0; i < a.length; i++) a[i] = rng.normal(std)
  return a
}

class MLPLanguageModel {
  /**
   * @param {{ vocabSize: number, blockSize: number, embDim: number, hidden: number, seed?: number }} cfg
   */
  constructor(cfg) {
    this.vocabSize = cfg.vocabSize
    this.blockSize = cfg.blockSize
    this.embDim = cfg.embDim
    this.hidden = cfg.hidden
    this.fanIn = cfg.blockSize * cfg.embDim

    const rng = createRng(cfg.seed === undefined ? 1337 : cfg.seed)
    this.C = initMatrix(this.vocabSize, this.embDim, rng, 1.0)
    this.W1 = initMatrix(this.fanIn, this.hidden, rng, 1.0)
    this.b1 = new Float32Array(this.hidden)
    this.W2 = initMatrix(this.hidden, this.vocabSize, rng, 0.1)
    this.b2 = new Float32Array(this.vocabSize)

    /** parameter tensors in a fixed order; `decay` marks weights (not biases) */
    this.params = [
      { name: 'C', data: this.C, decay: true },
      { name: 'W1', data: this.W1, decay: true },
      { name: 'b1', data: this.b1, decay: false },
      { name: 'W2', data: this.W2, decay: true },
      { name: 'b2', data: this.b2, decay: false }
    ]
    this.grads = this.params.map((p) => new Float32Array(p.data.length))
  }

  get paramCount() {
    return this.params.reduce((n, p) => n + p.data.length, 0)
  }

  zeroGrad() {
    for (const g of this.grads) g.fill(0)
  }

  /**
   * Forward pass over a batch of contexts.
   * @param {Int32Array} x batchSize * blockSize token ids
   * @param {number} batchSize
   * @returns {{ emb: Float32Array, h: Float32Array, probs: Float32Array, batchSize: number, x: Int32Array }}
   */
  forward(x, batchSize) {
    const { embDim, hidden, vocabSize, fanIn, blockSize } = this
    const emb = new Float32Array(batchSize * fanIn)
    const h = new Float32Array(batchSize * hidden)
    const probs = new Float32Array(batchSize * vocabSize)

    for (let b = 0; b < batchSize; b++) {
      // embed and concatenate the context window
      for (let t = 0; t < blockSize; t++) {
        const id = x[b * blockSize + t]
        const src = id * embDim
        const dst = b * fanIn + t * embDim
        for (let e = 0; e < embDim; e++) emb[dst + e] = this.C[src + e]
      }
      // hidden layer: tanh(emb @ W1 + b1)
      for (let j = 0; j < hidden; j++) {
        let acc = this.b1[j]
        for (let d = 0; d < fanIn; d++) acc += emb[b * fanIn + d] * this.W1[d * hidden + j]
        h[b * hidden + j] = Math.tanh(acc)
      }
      // logits: h @ W2 + b2, then a numerically stable softmax
      let max = -Infinity
      const row = b * vocabSize
      for (let v = 0; v < vocabSize; v++) {
        let acc = this.b2[v]
        for (let j = 0; j < hidden; j++) acc += h[b * hidden + j] * this.W2[j * vocabSize + v]
        probs[row + v] = acc
        if (acc > max) max = acc
      }
      let sum = 0
      for (let v = 0; v < vocabSize; v++) {
        const e = Math.exp(probs[row + v] - max)
        probs[row + v] = e
        sum += e
      }
      for (let v = 0; v < vocabSize; v++) probs[row + v] /= sum
    }
    return { emb, h, probs, batchSize, x }
  }

  /**
   * Mean cross-entropy loss in nats.
   * @param {{ probs: Float32Array, batchSize: number }} out
   * @param {Int32Array} y target token ids
   */
  loss(out, y) {
    let total = 0
    for (let b = 0; b < out.batchSize; b++) {
      const p = out.probs[b * this.vocabSize + y[b]]
      total += -Math.log(Math.max(p, 1e-12))
    }
    return total / out.batchSize
  }

  /**
   * Backward pass; accumulates into this.grads (call zeroGrad first).
   * @param {{ emb: Float32Array, h: Float32Array, probs: Float32Array, batchSize: number, x: Int32Array }} out
   * @param {Int32Array} y
   */
  backward(out, y) {
    const { embDim, hidden, vocabSize, fanIn, blockSize } = this
    const B = out.batchSize
    const [dC, dW1, db1, dW2, db2] = this.grads
    const scale = 1 / B

    const dlogits = new Float32Array(B * vocabSize)
    for (let b = 0; b < B; b++) {
      for (let v = 0; v < vocabSize; v++) {
        dlogits[b * vocabSize + v] = out.probs[b * vocabSize + v] * scale
      }
      dlogits[b * vocabSize + y[b]] -= scale
    }

    const dh = new Float32Array(B * hidden)
    for (let b = 0; b < B; b++) {
      for (let v = 0; v < vocabSize; v++) {
        const g = dlogits[b * vocabSize + v]
        if (g === 0) continue
        db2[v] += g
        for (let j = 0; j < hidden; j++) {
          dW2[j * vocabSize + v] += out.h[b * hidden + j] * g
          dh[b * hidden + j] += this.W2[j * vocabSize + v] * g
        }
      }
    }

    const dEmb = new Float32Array(B * fanIn)
    for (let b = 0; b < B; b++) {
      for (let j = 0; j < hidden; j++) {
        const hv = out.h[b * hidden + j]
        const g = dh[b * hidden + j] * (1 - hv * hv) // tanh'
        if (g === 0) continue
        db1[j] += g
        for (let d = 0; d < fanIn; d++) {
          dW1[d * hidden + j] += out.emb[b * fanIn + d] * g
          dEmb[b * fanIn + d] += this.W1[d * hidden + j] * g
        }
      }
    }

    for (let b = 0; b < B; b++) {
      for (let t = 0; t < blockSize; t++) {
        const id = out.x[b * blockSize + t]
        const dst = id * embDim
        const src = b * fanIn + t * embDim
        for (let e = 0; e < embDim; e++) dC[dst + e] += dEmb[src + e]
      }
    }
  }

  /** Global L2 gradient norm (reported so a voter can see training is stable). */
  gradNorm() {
    let sum = 0
    for (const g of this.grads) for (let i = 0; i < g.length; i++) sum += g[i] * g[i]
    return Math.sqrt(sum)
  }

  /**
   * Sample continuation text.
   * @param {{ itos: string[], stoi: Record<string, number> }} vocab
   * @param {{ length?: number, temperature?: number, prompt?: string, seed?: number }} opts
   */
  generate(vocab, opts = {}) {
    const length = opts.length || 200
    const temperature = opts.temperature === undefined ? 1.0 : Math.max(opts.temperature, 1e-3)
    const rng = createRng(opts.seed === undefined ? 7 : opts.seed)
    const context = new Int32Array(this.blockSize) // padded with token 0
    const prompt = opts.prompt || ''
    let out = prompt
    const seedIds = []
    for (const ch of prompt) if (vocab.stoi[ch] !== undefined) seedIds.push(vocab.stoi[ch])
    for (const id of seedIds) {
      context.copyWithin(0, 1)
      context[this.blockSize - 1] = id
    }

    for (let i = 0; i < length; i++) {
      const step = this.forward(context, 1)
      let r = rng.next()
      let pick = this.vocabSize - 1
      let cum = 0
      // temperature-scaled renormalisation of the softmax row
      const scaled = new Float64Array(this.vocabSize)
      let z = 0
      for (let v = 0; v < this.vocabSize; v++) {
        scaled[v] = Math.pow(Math.max(step.probs[v], 1e-12), 1 / temperature)
        z += scaled[v]
      }
      for (let v = 0; v < this.vocabSize; v++) {
        cum += scaled[v] / z
        if (r <= cum) {
          pick = v
          break
        }
      }
      out += vocab.itos[pick]
      context.copyWithin(0, 1)
      context[this.blockSize - 1] = pick
    }
    return out
  }

  /** Serialisable checkpoint (plain JSON, no binary format to argue about). */
  toJSON(vocab) {
    return {
      format: 'astar-mlp-lm/1',
      config: {
        vocabSize: this.vocabSize,
        blockSize: this.blockSize,
        embDim: this.embDim,
        hidden: this.hidden
      },
      vocab: vocab ? vocab.itos : undefined,
      params: this.params.reduce((acc, p) => {
        acc[p.name] = Array.from(p.data)
        return acc
      }, /** @type {Record<string, number[]>} */ ({}))
    }
  }

  /** @param {any} json a checkpoint produced by toJSON */
  static fromJSON(json) {
    const model = new MLPLanguageModel(json.config)
    for (const p of model.params) {
      const values = json.params[p.name]
      if (!values || values.length !== p.data.length) {
        throw new Error('Checkpoint is missing or mis-shaped for parameter ' + p.name)
      }
      p.data.set(values)
    }
    return model
  }
}

module.exports = { MLPLanguageModel }
