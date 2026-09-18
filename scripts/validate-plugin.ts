import { createHash } from 'node:crypto'
import { lstatSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'

export const files = [
  '.claude-plugin/plugin.json',
  '.claude-plugin/marketplace.json',
  '.mcp.json',
  '.github/workflows/release.yml',
  'skills/lumiere-research/SKILL.md',
  'scripts/validate-plugin.ts',
  'scripts/open-release-pr.ts',
  'README.md',
  'LICENSE',
  'CHANGELOG.md',
].sort()

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Expected JSON object')
  return Object.fromEntries(Object.entries(value))
}
export function readJson(path: string) {
  return object(JSON.parse(readFileSync(path, 'utf8')))
}
export function versionParts(value: unknown) {
  if (
    typeof value !== 'string' ||
    !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value)
  )
    throw new Error('Plugin version must be stable MAJOR.MINOR.PATCH')
  return value.split('.').map(BigInt)
}
export function newer(next: string, current: string) {
  const a = versionParts(next),
    b = versionParts(current)
  for (const [i, part] of a.entries()) {
    const previous = b[i]
    if (previous === undefined) throw new Error('Invalid version')
    if (part !== previous) return part > previous
  }
  return false
}
export function noSymlinks(path: string) {
  for (let current = resolve(path); ; current = dirname(current)) {
    if (lstatSync(current, { throwIfNoEntry: false })?.isSymbolicLink())
      throw new Error(`Symlinked path: ${path}`)
    if (dirname(current) === current) return
  }
}
export function hashes(root: string) {
  return Object.fromEntries(
    files.map((name) => [
      name,
      createHash('sha256')
        .update(readFileSync(join(root, name)))
        .digest('hex'),
    ]),
  )
}
export function parseRelease(value: unknown) {
  const data = object(value)
  const version = data.version,
    sourceCommit = data.source_commit
  versionParts(version)
  if (
    typeof version !== 'string' ||
    typeof sourceCommit !== 'string' ||
    !/^[a-f0-9]{40}$/.test(sourceCommit)
  )
    throw new Error('Invalid release provenance')
  const entries = object(data.files)
  const result: Record<string, string> = {}
  for (const [name, hash] of Object.entries(entries)) {
    if (typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash))
      throw new Error('Invalid release hash')
    result[name] = hash
  }
  return { version, source_commit: sourceCommit, files: result }
}
export function validate(root: string) {
  const actual: string[] = []
  function walk(relative = '') {
    for (const entry of readdirSync(join(root, relative), {
      withFileTypes: true,
    })) {
      if (!relative && entry.name === '.git') continue
      const name = relative ? `${relative}/${entry.name}` : entry.name
      if (entry.isSymbolicLink()) throw new Error(`Symlinked path: ${name}`)
      if (entry.isDirectory()) walk(name)
      else if (entry.isFile()) actual.push(name)
      else throw new Error(`Unsupported file: ${name}`)
    }
  }
  walk()
  if (!isDeepStrictEqual(actual.sort(), [...files, 'release.json'].sort()))
    throw new Error('Unexpected/missing public files')
  const manifest = readJson(join(root, '.claude-plugin/plugin.json'))
  versionParts(manifest.version)
  if (manifest.name !== 'lumiere' || manifest.license !== 'MIT')
    throw new Error('Unexpected plugin identity or license')
  if (
    !isDeepStrictEqual(readJson(join(root, '.mcp.json')), {
      mcpServers: {
        lumiere: { type: 'http', url: 'https://lumiere.ai/app/api/mcp' },
      },
    })
  )
    throw new Error('Only the production OAuth MCP endpoint may be published')
  const marketplace = readJson(join(root, '.claude-plugin/marketplace.json'))
  if (
    marketplace.name !== 'lumiere-plugins' ||
    !Array.isArray(marketplace.plugins) ||
    marketplace.plugins.length !== 1
  )
    throw new Error('Unexpected marketplace')
  const entry = object(marketplace.plugins[0])
  if (entry.name !== 'lumiere' || entry.source !== './')
    throw new Error('Marketplace must refer to this plugin')
  const skill = readFileSync(
    join(root, 'skills/lumiere-research/SKILL.md'),
    'utf8',
  )
  if (
    !skill.startsWith('---\nname: lumiere-research\ndescription: ') ||
    !skill.slice(4).includes('\n---\n')
  )
    throw new Error('Invalid skill frontmatter')
  if (
    !readFileSync(join(root, 'CHANGELOG.md'), 'utf8').includes(
      `## ${manifest.version}\n`,
    )
  )
    throw new Error('Add a changelog entry for this version')
  const release = parseRelease(readJson(join(root, 'release.json')))
  if (
    release.version !== manifest.version ||
    !isDeepStrictEqual(release.files, hashes(root))
  )
    throw new Error('Release version or file hashes do not match')
  return release
}
if (import.meta.main) console.log(validate(resolve(process.argv[2] ?? '.')))
