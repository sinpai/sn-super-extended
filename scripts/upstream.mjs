#!/usr/bin/env node
/**
 * Keeps the vendored Standard Notes sources (src/web, src/packages) in sync with upstream.
 *
 *   node scripts/upstream.mjs status <path-to-standardnotes-app-checkout>
 *   node scripts/upstream.mjs sync   <path-to-standardnotes-app-checkout>
 *   node scripts/upstream.mjs add    <path-to-standardnotes-app-checkout> <upstream/path ...>
 *   node scripts/upstream.mjs diff   <path-to-standardnotes-app-checkout> <upstream/path>
 *
 * upstream/manifest.json records, for every tracked file, the sha256 of the upstream version it was
 * last synced from. That makes three-way decisions possible:
 *   - you didn't touch a file and upstream changed it  -> `sync` updates it
 *   - you changed a file and upstream didn't           -> kept as is
 *   - both changed                                     -> conflict; upstream copy is written to
 *                                                         upstream/conflicts/<path> for manual merging
 * Files listed under "overrides" are plugin-specific replacements of upstream files. They are never
 * overwritten; `status` tells you when the upstream original changed so you can port the change.
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = path.join(projectRoot, 'upstream', 'manifest.json')
const conflictsDir = path.join(projectRoot, 'upstream', 'conflicts')

const [command, upstreamArg, ...rest] = process.argv.slice(2)

function usage(message) {
  if (message) {
    console.error(`Error: ${message}\n`)
  }
  console.error('Usage: node scripts/upstream.mjs <status|sync|add|diff> <path-to-standardnotes-app> [upstream paths...]')
  process.exit(1)
}

if (!command || !['status', 'sync', 'add', 'diff'].includes(command)) {
  usage()
}
if (!upstreamArg) {
  usage('missing path to a checkout of https://github.com/standardnotes/app')
}

const upstreamRoot = path.resolve(upstreamArg)
if (!fs.existsSync(path.join(upstreamRoot, 'packages', 'web'))) {
  usage(`${upstreamRoot} does not look like a checkout of standardnotes/app (no packages/web)`)
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

const sha256 = (file) => (fs.existsSync(file) ? crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') : null)

function toLocal(upstreamPath) {
  for (const mapping of manifest.mappings) {
    if (upstreamPath.startsWith(mapping.upstream)) {
      return path.join(projectRoot, mapping.local + upstreamPath.slice(mapping.upstream.length))
    }
  }
  throw new Error(`No mapping for ${upstreamPath}`)
}

function upstreamCommit() {
  try {
    return execFileSync('git', ['-C', upstreamRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  } catch {
    return undefined
  }
}

function upstreamWebVersion() {
  try {
    return JSON.parse(fs.readFileSync(path.join(upstreamRoot, 'packages/web/package.json'), 'utf8')).version
  } catch {
    return undefined
  }
}

function classify(upstreamPath, baseHash) {
  const upstreamFile = path.join(upstreamRoot, upstreamPath)
  const localFile = toLocal(upstreamPath)
  const upstreamHash = sha256(upstreamFile)
  const localHash = sha256(localFile)

  if (!upstreamHash) return { state: 'deleted-upstream', upstreamHash, localHash }
  if (!localHash) return { state: 'missing-locally', upstreamHash, localHash }
  if (localHash === upstreamHash) return { state: 'in-sync', upstreamHash, localHash }
  if (!baseHash) return { state: 'conflict', upstreamHash, localHash }
  if (localHash === baseHash) return { state: 'upstream-changed', upstreamHash, localHash }
  if (upstreamHash === baseHash) return { state: 'modified-locally', upstreamHash, localHash }
  return { state: 'conflict', upstreamHash, localHash }
}

function copyUpstream(upstreamPath, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true })
  fs.copyFileSync(path.join(upstreamRoot, upstreamPath), destination)
}

function saveManifest() {
  manifest.files = Object.fromEntries(Object.entries(manifest.files).sort(([a], [b]) => a.localeCompare(b)))
  manifest.overrides = Object.fromEntries(Object.entries(manifest.overrides).sort(([a], [b]) => a.localeCompare(b)))
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
}

if (command === 'diff') {
  const [upstreamPath] = rest
  if (!upstreamPath) usage('diff needs an upstream path')
  try {
    execFileSync('git', ['diff', '--no-index', '--', path.join(upstreamRoot, upstreamPath), toLocal(upstreamPath)], {
      stdio: 'inherit',
    })
  } catch {
    // git diff exits with 1 when files differ
  }
  process.exit(0)
}

if (command === 'add') {
  if (rest.length === 0) usage('add needs at least one upstream path')
  for (const upstreamPath of rest) {
    const localFile = toLocal(upstreamPath)
    if (fs.existsSync(localFile)) {
      console.log(`exists     ${upstreamPath} (left untouched, now tracked)`)
    } else {
      copyUpstream(upstreamPath, localFile)
      console.log(`added      ${upstreamPath}`)
    }
    manifest.files[upstreamPath] = sha256(path.join(upstreamRoot, upstreamPath))
  }
  saveManifest()
  process.exit(0)
}

const counts = {}
const report = []

for (const [upstreamPath, baseHash] of Object.entries(manifest.files)) {
  const result = classify(upstreamPath, baseHash)
  counts[result.state] = (counts[result.state] ?? 0) + 1

  if (command === 'sync') {
    if (result.state === 'missing-locally' || result.state === 'upstream-changed') {
      copyUpstream(upstreamPath, toLocal(upstreamPath))
      manifest.files[upstreamPath] = result.upstreamHash
    } else if (result.state === 'in-sync') {
      manifest.files[upstreamPath] = result.upstreamHash
    } else if (result.state === 'conflict') {
      copyUpstream(upstreamPath, path.join(conflictsDir, upstreamPath))
    }
  }

  if (result.state !== 'in-sync') {
    report.push(`${result.state.padEnd(18)} ${upstreamPath}`)
  }
}

for (const [upstreamPath, override] of Object.entries(manifest.overrides)) {
  const upstreamHash = sha256(path.join(upstreamRoot, upstreamPath))
  let state = 'override'
  if (!upstreamHash) state = 'override-deleted-upstream'
  else if (override.sha256 && override.sha256 !== upstreamHash) state = 'override-upstream-changed'
  counts[state] = (counts[state] ?? 0) + 1
  if (state !== 'override') {
    report.push(`${state.padEnd(18)} ${upstreamPath}\n${''.padEnd(19)}(plugin replacement: ${override.reason})`)
  }
  if (command === 'sync' && upstreamHash && !override.sha256) {
    override.sha256 = upstreamHash
  }
}

console.log(report.join('\n') || 'Everything is in sync.')
console.log('\nSummary:', counts)

if (command === 'sync') {
  manifest.commit = upstreamCommit() ?? manifest.commit
  manifest.webVersion = upstreamWebVersion() ?? manifest.webVersion
  saveManifest()
  if (counts.conflict) {
    console.log(`\nConflicting upstream versions were written to ${path.relative(projectRoot, conflictsDir)}/`)
  }
  if (counts['override-upstream-changed']) {
    console.log(
      '\nSome overridden upstream files changed. Inspect with:\n  node scripts/upstream.mjs diff <checkout> <upstream/path>\n' +
        'then port what you need and set its "sha256" in upstream/manifest.json to the new upstream hash.',
    )
  }
}
