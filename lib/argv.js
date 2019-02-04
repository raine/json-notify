const minimist = require('minimist')
const path = require('path')
const dedent = require('dedent')
const _ = require('lodash')

const HELP =
  dedent`
    Usage: json-notify [options]

      Takes a list of objects as JSON through stdin. Keeps track of seen objects.
      By default, prints unseen objects to stdout, but can also send notifications.

      First execution will "prime" the cache and won't print output or notify.

      -n, --name        name to identify the cache used, defaults to "default"
      -c, --cache-path  path to cache directory, overrides $HOME/.config/json-notify
      -h, --help        view help
      -v, --verbose     see debug output
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
