const minimist = require('minimist')
const dedent = require('dedent')

const HELP = dedent`
  Usage: json-notify [options]
  `.trim()

const parseArgv = (argv) => {
  const parsed = minimist(argv, {
    alias: {
      v: 'verbose'
    }
  })

  return parsed
}

module.exports = { parseArgv, HELP }
