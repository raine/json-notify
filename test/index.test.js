const main = require('../')
const fs = require('fs')
const { promisify } = require('util')
const d = require('dedent')
const path = require('path')
const tempy = require('tempy')
const { PassThrough } = require('stream')
const mkdir = require('../lib/mkdir')
const { readAsync } = require('bluestream')
const stringArgv = require('string-argv')

const readFileAsync = promisify(fs.readFile)
const writeFileAsync = promisify(fs.writeFile)
const readFile = (file) => readFileAsync(file, 'utf8')
const writeFile = (file, data) => writeFileAsync(file, data, 'utf8')
const toString = (x) => (x !== null ? x.toString() : null)

const run = async (input, args = '', home = tempy.directory()) => {
  const stdin = new PassThrough()
  const stdout = new PassThrough()
  const stderr = new PassThrough()
  const argv = stringArgv(args)
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

const TEST_INPUT = [{ foo: 'bar' }, { foo: 'xyz' }]
const TEST_INPUT_HASHES = d`
  pedE0BZFQNM7HX6mFsKPL6l+dUo=
  JLlNsm5BmruzidmR1EbUCv3dgZs=\n`

const temp = () => {
  const home = tempy.directory()
  const cachePath = path.join(home, '.config', 'json-notify')
  mkdir(cachePath)
  return [home, cachePath]
}

test('prints help with --help', async () => {
  const [_, stderr] = await run(null, '--help')
  expect(stderr.split('\n')[0]).toBe(`Usage: json-notify [options]`)
})

test('prints an error when object is passed as input', async () => {
  const [stdout, stderr] = await run('{}', '')
  expect(stderr).toBe('Error: Top-level object should be an array.\n')
})

describe('cache', () => {
  test('writes hashes to default cache by default', async () => {
    const [home] = temp()
    await run(TEST_INPUT, '', home)
    expect(
      await readFile(path.join(home, '.config', 'json-notify', 'default.cache'))
    ).toBe(TEST_INPUT_HASHES)
  })

  test('writes hashes to cache file specified by --name', async () => {
    const [home] = temp()
    await run(TEST_INPUT, '--name test', home)
    expect(
      readFile(path.join(home, '.config', 'json-notify', 'test.cache'))
    ).resolves.toBe(TEST_INPUT_HASHES)
  })

  test('uses id property instead of hash if available', async () => {
    const input = [{ id: 1 }, { id: 2 }]
    const [home] = temp()
    await run(input, '', home)
    expect(
      readFile(path.join(home, '.config', 'json-notify', 'default.cache'))
    ).resolves.toBe('1\n2\n')
  })

  test('uses given id instead of hash if available', async () => {
    const input = [{ test_id: 1 }, { test_id: 2 }]
    const [home] = temp()
    await run(input, '--id-key test_id', home)
    expect(
      readFile(path.join(home, '.config', 'json-notify', 'default.cache'))
    ).resolves.toBe('1\n2\n')
  })

  test('appends hash to existing default cache', async () => {
    const input = [...TEST_INPUT, { foo: '123' }]
    const [home] = temp()
    await writeFile(
      path.join(home, '.config', 'json-notify', 'default.cache'),
      TEST_INPUT_HASHES
    )
    await run(input, '', home)
    expect(readFile(path.join(home, '.config', 'json-notify', 'default.cache')))
      .resolves.toBe(d`${TEST_INPUT_HASHES.trim()}
             tCZLP88NkBIfJD1s7bgZ3Zx56jU=\n`)
  })

  test('--cache-path overrides the cache location', async () => {
    const tempCachePath = tempy.directory()
    await run(TEST_INPUT, `--cache-path ${tempCachePath}`)
    expect(await readFile(path.join(tempCachePath, 'default.cache'))).toBe(
      TEST_INPUT_HASHES
    )
  })
})

test('prints new items as json', async () => {
  const input = [...TEST_INPUT, { foo: '123' }]
  const [home] = temp()
  await writeFile(
    path.join(home, '.config', 'json-notify', 'default.cache'),
    TEST_INPUT_HASHES
  )
  const [stdout, _] = await run(input, '', home)
  expect(stdout).toBe(
    d`[
        {
          "foo": "123"
        }
      ]\n`
  )
})

test('prints an empty list without new items', async () => {
  const [home] = temp()
  await writeFile(
    path.join(home, '.config', 'json-notify', 'default.cache'),
    TEST_INPUT_HASHES
  )
  const [stdout, _] = await run(TEST_INPUT, '', home)
  expect(stdout).toBe('[]\n')
})

test('does not print on first run for specific cache', async () => {
  const input = TEST_INPUT
  const [home] = temp()
  const [stdout, _] = await run(input, '', home)
  expect(stdout).toBe(null)
})
