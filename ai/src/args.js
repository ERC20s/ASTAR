'use strict'

/**
 * Tiny `--flag value` parser. No dependency, and every flag the scripts accept
 * is declared with a default so `npm run train` works with no arguments at all.
 */

/**
 * @param {string[]} argv typically process.argv.slice(2)
 * @param {Record<string, string|number|boolean>} defaults
 */
function parseArgs(argv, defaults) {
  const out = Object.assign({}, defaults)
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]
    if (!token.startsWith('--')) continue
    let key = token.slice(2)
    let value
    const eq = key.indexOf('=')
    if (eq !== -1) {
      value = key.slice(eq + 1)
      key = key.slice(0, eq)
    } else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
      value = argv[++i]
    } else {
      value = 'true'
    }
    const camel = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
    if (!(camel in out)) {
      throw new Error('Unknown option --' + key + '. Known options: ' + Object.keys(defaults).join(', '))
    }
    const current = out[camel]
    if (typeof current === 'number') {
      const n = Number(value)
      if (!Number.isFinite(n)) throw new Error('--' + key + ' expects a number, got "' + value + '"')
      out[camel] = n
    } else if (typeof current === 'boolean') {
      out[camel] = value !== 'false' && value !== '0'
    } else {
      out[camel] = value
    }
  }
  return out
}

module.exports = { parseArgs }
