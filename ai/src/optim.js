'use strict'

/**
 * AdamW, written out in full so the update rule is auditable.
 * Decoupled weight decay is applied to weight matrices only (biases keep
 * `decay: false` in the model's parameter list).
 */
class AdamW {
  /**
   * @param {{ params: Array<{ name: string, data: Float32Array, decay: boolean }>, lr?: number, beta1?: number, beta2?: number, eps?: number, weightDecay?: number, clip?: number }} opts
   */
  constructor(opts) {
    this.params = opts.params
    this.lr = opts.lr === undefined ? 0.05 : opts.lr
    this.beta1 = opts.beta1 === undefined ? 0.9 : opts.beta1
    this.beta2 = opts.beta2 === undefined ? 0.999 : opts.beta2
    this.eps = opts.eps === undefined ? 1e-8 : opts.eps
    this.weightDecay = opts.weightDecay === undefined ? 0.01 : opts.weightDecay
    this.clip = opts.clip === undefined ? 1.0 : opts.clip
    this.t = 0
    this.m = this.params.map((p) => new Float32Array(p.data.length))
    this.v = this.params.map((p) => new Float32Array(p.data.length))
  }

  /**
   * One optimiser step.
   * @param {Float32Array[]} grads gradients, in the same order as params
   * @param {number} lr optional per-step learning rate (for decay schedules)
   */
  step(grads, lr = this.lr) {
    this.t += 1
    const bc1 = 1 - Math.pow(this.beta1, this.t)
    const bc2 = 1 - Math.pow(this.beta2, this.t)

    // global gradient clipping keeps a bad batch from wrecking a run
    let scale = 1
    if (this.clip > 0) {
      let sum = 0
      for (const g of grads) for (let i = 0; i < g.length; i++) sum += g[i] * g[i]
      const norm = Math.sqrt(sum)
      if (norm > this.clip) scale = this.clip / (norm + 1e-12)
    }

    for (let k = 0; k < this.params.length; k++) {
      const p = this.params[k].data
      const g = grads[k]
      const m = this.m[k]
      const v = this.v[k]
      for (let i = 0; i < p.length; i++) {
        const gi = g[i] * scale
        m[i] = this.beta1 * m[i] + (1 - this.beta1) * gi
        v[i] = this.beta2 * v[i] + (1 - this.beta2) * gi * gi
        const mHat = m[i] / bc1
        const vHat = v[i] / bc2
        let update = (lr * mHat) / (Math.sqrt(vHat) + this.eps)
        if (this.params[k].decay && this.weightDecay > 0) update += lr * this.weightDecay * p[i]
        p[i] -= update
      }
    }
  }
}

/**
 * Linear warmup then cosine decay to 10% of the peak learning rate.
 * @param {number} step
 * @param {number} total
 * @param {number} peak
 * @param {number} warmup
 */
function lrAt(step, total, peak, warmup) {
  if (warmup > 0 && step < warmup) return (peak * (step + 1)) / warmup
  const progress = total > warmup ? (step - warmup) / (total - warmup) : 1
  const cosine = 0.5 * (1 + Math.cos(Math.PI * Math.min(Math.max(progress, 0), 1)))
  return peak * (0.1 + 0.9 * cosine)
}

module.exports = { AdamW, lrAt }
