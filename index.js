const fs = require('fs')
const { parser } = require('stream-json/Parser')
const { streamArray } = require('stream-json/streamers/StreamArray')
const Debug = require('debug')
const debug = Debug('json-notify')
const path = require('path')
const { transform, pipe, filter, reduce } = require('bluestream')
const split2 = require('split2')
const fastJsonStableStringify = require('fast-json-stable-stringify')
const mkdir = require('./lib/mkdir')
const sha1base64 = require('./lib/sha1base64')
const { parseArgv, HELP } = require('./lib/argv')
const { promisify } = require('util')

const lines = (str) => str.split('\n')
const firstLine = (str) => lines(str)[0]
const logError = (stderr) => (msg) => stderr.write(msg.toString() + '\n')
const readFileStream = (file) => fs.createReadStream(file, { encoding: 'utf8' })
const access = promisify(fs.access)
const fileExist = (file) =>
  access(file, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false)

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

const objectToId = (key, obj) =>
  obj.hasOwnProperty(key)
    ? obj[key].toString()
    : sha1base64(fastJsonStableStringify(obj))

const main = async (stdin, stdout, stderr, argv, home) => {
  const opts = parseArgv(argv, home)
  if (opts.verbose) Debug.enable('json-notify')
  if (opts.help) {
    stderr.write(HELP)
    process.exitCode = 1
    return
  }

  const cacheFilePath = path.join(opts.cachePath, `${opts.name}.cache`)
  debug('cache directory', opts.cachePath)
  debug('cache file', cacheFilePath)
  mkdir(opts.cachePath)

  const firstRun = !(await fileExist(cacheFilePath))
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
      findLineInFile(cacheFilePath, objectToId(opts.idKey, obj)).then((x) => !x)
    ),
    reduce((acc, value) => acc.concat(value), [])
  )
    .then(
      (newItems) =>
        new Promise((resolve) => {
          if (newItems !== null) {
            newItems.map(obj => objectToId(opts.idKey, obj)).forEach((id) => {
              debug(`${id} added to cache`)
              cacheWriteStream.write(id + '\n')
            })

            cacheWriteStream.on('finish', () => resolve(newItems))
            cacheWriteStream.end()
          }
        })
    )
    .then((newItems) => {
      if (!firstRun) stdout.write(JSON.stringify(newItems, null, 2) + '\n')
    })
    .catch((err) => {
      onParseError(logError(stderr))(err)
      process.exitCode = 1
    })
}

module.exports = main
