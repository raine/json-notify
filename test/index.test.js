const main = require('../')
const fs = require('fs')
const { promisify } = require('util')
const d = require('dedent')
const path = require('path')
const tempy = require('tempy')
const { PassThrough } = require('stream')
const mkdir = require('../lib/mkdir')
const { readAsync } = require('bluestream')

const readFileAsync = promisify(fs.readFile)
const writeFileAsync = promisify(fs.writeFile)
const readFile = (file) => readFileAsync(file, 'utf8')
const writeFile = (file, data) => writeFileAsync(file, data, 'utf8')
const toString = (x) => (x !== null ? x.toString() : null)

const run = async (input, argv = [], home = tempy.directory()) => {
  const stdin = new PassThrough()
  const stdout = new PassThrough()
  const stderr = new PassThrough()
  if (input)
    stdin.end(typeof input !== 'string' ? JSON.stringify(input) : input)
  await main(stdin, stdout, stderr, argv, home)
  stderr.end()
  stdout.end()
  return Promise.all([
    readAsync(stdout).then(toString),
    readAsync(stderr).then(toString)
  ])
}

const temp = () => {
  const home = tempy.directory()
  const cachePath = path.join(home, '.config', 'json-notify-cache')
  mkdir(path.dirname(cachePath))
  return [home, cachePath]
}

test('prints an error when object is passed as input', async () => {
  const [stdout, stderr] = await run('{}', [])
  expect(stderr).toBe('Error: Top-level object should be an array.\n')
})

test('uses id property as hash if available', async () => {
  const input = [{ id: 1 }, { id: 2 }]
  const [home, cachePath] = temp()
  await run(input, [], home)
  expect(await readFile(cachePath)).toBe('1\n2\n')
})

test('writes hashes of received objects to cache in $HOME/.config', async () => {
  const input = [{ foo: 'bar' }, { foo: 'xyz' }]
  const [home, cachePath] = temp()
  await run(input, [], home)
  expect(await readFile(cachePath)).toBe(
    d`pedE0BZFQNM7HX6mFsKPL6l+dUo=
      JLlNsm5BmruzidmR1EbUCv3dgZs=\n`
  )
})

test('appends hash to existing cache', async () => {
  const input = [{ foo: 'bar' }, { foo: 'xyz' }, { foo: '123' }]
  const [home, cachePath] = temp()
  await writeFile(
    cachePath,
    d`pedE0BZFQNM7HX6mFsKPL6l+dUo=
      JLlNsm5BmruzidmR1EbUCv3dgZs=\n`
  )
  await run(input, [], home)
  expect(await readFile(cachePath)).toBe(
    d`pedE0BZFQNM7HX6mFsKPL6l+dUo=
      JLlNsm5BmruzidmR1EbUCv3dgZs=
      tCZLP88NkBIfJD1s7bgZ3Zx56jU=\n`
  )
})

test('prints new items as json', async () => {
  const input = [{ foo: 'bar' }, { foo: 'xyz' }, { foo: '123' }]
  const [home, cachePath] = temp()
  await writeFile(
    cachePath,
    d`pedE0BZFQNM7HX6mFsKPL6l+dUo=
      JLlNsm5BmruzidmR1EbUCv3dgZs=\n`
  )
  const [stdout, _] = await run(input, [], home)
  expect(stdout).toBe(
    d`[
        {
          "foo": "123"
        }
      ]`
  )
})

test('prints help with --help', async () => {
  const input = null
  const [_, stderr] = await run(null, ['--help'])
  expect(stderr.split('\n')[0]).toBe(`Usage: json-notify [options]`)
})
