import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { object, validate } from './validate-plugin'

const release = validate(process.cwd())
const branch = process.env.RELEASE_BRANCH
if (branch !== `release/v${release.version}`)
  throw new Error('Branch does not match release version')
const result: unknown = JSON.parse(
  execFileSync(
    'gh',
    [
      'pr',
      'list',
      '--head',
      branch,
      '--base',
      'main',
      '--state',
      'all',
      '--json',
      'url',
    ],
    { encoding: 'utf8' },
  ),
)
if (!Array.isArray(result)) throw new Error('Unexpected PR response')
if (result.length) console.log(object(result[0]).url)
else {
  const temp = mkdtempSync(join(tmpdir(), 'lumiere-release-'))
  try {
    const body = join(temp, 'body.md')
    writeFileSync(
      body,
      `## Summary\n\nPublish Lumiere ${release.version} from source commit \`${release.source_commit}\`.\n\n## Changes\n\nSee CHANGELOG.md and the diff for this allowlisted snapshot. No private repository history is included.\n\n## Testing\n\nDistribution integrity and strict Claude validation passed. Live OAuth and research acceptance are checked separately by the release owner.\n\n## Release review\n\nReview the public files before merging. Merge releases this version to marketplace users; after directory acceptance, Anthropic also picks up repository updates.\n`,
    )
    console.log(
      execFileSync(
        'gh',
        [
          'pr',
          'create',
          '--base',
          'main',
          '--head',
          branch,
          '--title',
          `Release Lumiere ${release.version}`,
          '--body-file',
          body,
        ],
        { encoding: 'utf8' },
      ),
    )
  } finally {
    rmSync(temp, { recursive: true, force: true })
  }
}
