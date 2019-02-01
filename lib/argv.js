const minimist = require('minimist')
const path = require('path')
const dedent = require('dedent')
const _ = require('lodash')

const HELP =
  dedent`
    Usage: json-notify [options]

      -c, --cache-path  path to cache file, overrides $HOME/.config/json-notify-cache
      -h, --help        view help
      -v, --verbose     see debug output
` + '\n'

const parseArgv = (argv, home) =>
  _.mapKeys(
    minimist(argv, {
      string: ['cachePath'],
      alias: {
        v: 'verbose',
        h: 'help',
        c: 'cache-path'
      },
      default: {
        'cache-path': path.join(home, '.config', 'json-notify-cache')
      }
    }),
    (v, k) => _.camelCase(k)
  )

module.exports = { parseArgv, HELP }
