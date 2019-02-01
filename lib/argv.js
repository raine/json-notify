const minimist = require('minimist')
const dedent = require('dedent')

const HELP = dedent`
  Usage: json-notify [options]\n
  `

const parseArgv = (argv) => {
  const parsed = minimist(argv, {
    alias: {
      v: 'verbose',
      h: 'help'
    }
  })

  return parsed
}

module.exports = { parseArgv, HELP }
