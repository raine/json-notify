const minimist = require('minimist')
const path = require('path')
const dedent = require('dedent')
const _ = require('lodash')

const HELP =
  dedent`
    Usage: json-notify [options]

      -n, --name     name for the notifier instance, identifies cache file used
      -c, --cache    path to cache directory, overrides $HOME/.config/json-notify
      -h, --help     view help
      -v, --verbose  see debug output
` + '\n'

const parseArgv = (argv, home) =>
  _.mapKeys(
    minimist(argv, {
      string: ['cache-path', 'name'],
      alias: {
        v: 'verbose',
        h: 'help',
        c: 'cache-path'
      },
      default: {
        'cache-path': path.join(home, '.config', 'json-notify'),
        name: 'default'
      }
    }),
    (v, k) => _.camelCase(k)
  )

module.exports = { parseArgv, HELP }
