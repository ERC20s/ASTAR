'use strict'

/**
 * Deterministic pseudo-random number generation.
 *
 * Every run of the training loop must be reproducible from a seed, otherwise
 * "the loss went down" is not a claim anybody can check. No dependencies: this
 * is a mulberry32 generator plus a Box-Muller normal sampler on top of it.
 */

/**
 * @param {number} seed
 * @returns {{ next: () => number, normal: (std?: number) => number, int: (max: number) => number }}
 */
function createRng(seed) {
  let state = (seed >>> 0) || 1

  function next() {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  /** Standard normal scaled by `std`. */
  function normal(std = 1) {
    let u = 0
    let v = 0
    while (u === 0) u = next()
    while (v === 0) v = next()
    return std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }

  /** Uniform integer in [0, max). */
  function int(max) {
    return Math.floor(next() * max)
  }

  return { next, normal, int }
}

module.exports = { createRng }
