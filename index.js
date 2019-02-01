const fs = require('fs')
const { parser } = require('stream-json/Parser')
const { streamArray } = require('stream-json/streamers/StreamArray')
const Debug = require('debug')
const debug = Debug('json-notify')
const path = require('path')
const { transform, pipe, filter, tap, collect, reduce } = require('bluestream')
const split2 = require('split2')
const fastJsonStableStringify = require('fast-json-stable-stringify')
const mkdir = require('./lib/mkdir')
const sha1base64 = require('./lib/sha1base64')
const { parseArgv } = require('./lib/argv')

const lines = (str) => str.split('\n')
const firstLine = (str) => lines(str)[0]
const logError = (stderr) => (msg) => stderr.write(msg.toString() + '\n')
const readFileStream = (file) => fs.createReadStream(file, { encoding: 'utf8' })

const onParseError = (logError) => (err) => {
  logError(
    err.message === 'Top-level object should be an array.'
      ? firstLine(err.stack)
      : err.stack
  )
}

const findLineInFile = (file, str) =>
  new Promise((resolve, reject) => {
    let found = false
    let readStream

    readStream = readFileStream(file).pipe(split2())
    readStream
      .on('data', (chunk) => {
        if (chunk === str) {
          debug(`${str} found in cache`)
          found = true
          resolve(true)
          readStream.destroy()
        }
      })
      .on('end', () => {
        if (!found) {
          debug(`${str} not found in cache`)
          resolve(false)
        }
      })
      .on('error', reject)
  })

const objectToId = (obj) =>
  obj.hasOwnProperty('id')
    ? obj.id.toString()
    : sha1base64(fastJsonStableStringify(obj))

const main = async (stdin, stdout, stderr, argv, home) => {
  const opts = parseArgv(argv)
  if (opts.verbose) Debug.enable('json-notify')
  const homeCachePath = path.join(home, '.config', 'json-notify-cache')
  mkdir(path.dirname(homeCachePath))
  const cacheFilePath = homeCachePath // TODO: Override with argv
  debug('cacheFilePath', cacheFilePath)
  const cacheWriteStream = fs.createWriteStream(cacheFilePath, {
    encoding: 'utf8',
    flags: 'a'
  })

  await pipe(
    stdin,
    parser(),
    streamArray(),
    transform(({ value }) => value),
    filter((obj) =>
      findLineInFile(cacheFilePath, objectToId(obj)).then((x) => !x)
    ),
    reduce((acc, value) => acc.concat(value), [])
  )
    .then(
      (newItems) =>
        new Promise((resolve, reject) => {
          if (newItems !== null) {
            newItems.map(objectToId).forEach((id) => {
              debug(`${id} added to cache`)
              cacheWriteStream.write(id + '\n')
            })

            cacheWriteStream.on('finish', () => resolve(newItems))
            cacheWriteStream.end()
          }
        })
    )
    .then((newItems) => {
      if (newItems.length) {
        stdout.write(JSON.stringify(newItems, null, 2))
      }
    })
    .catch((err) => {
      onParseError(logError(stderr))(err)
      process.exitCode = 1
    })
}

module.exports = main
