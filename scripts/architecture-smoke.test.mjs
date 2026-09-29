import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import test from 'node:test'

async function routeFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? routeFiles(path) : path.endsWith('.tsx') ? [path] : []
  }))
  return nested.flat()
}

test('replacement routes use API adapters, not fixtures or ad hoc API/mutation calls', async () => {
  const routes = await routeFiles(new URL('../src/routes', import.meta.url).pathname)
  for (const file of routes) {
    const source = await readFile(file, 'utf8')
    assert.doesNotMatch(source, /from\s+['"][^'"]*data\/fixtures\//, `${file} must not import demo fixtures directly`)
    assert.doesNotMatch(source, /['"]\/api\/(?:v1|legacy)\//, `${file} must not call API URLs directly`)
    assert.doesNotMatch(source, /\bfetch\s*\(/, `${file} must route requests through the server API adapters`)
  }
})
