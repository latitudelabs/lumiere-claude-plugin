"""Validate the public distribution boundary and release provenance (Python 3)."""

import hashlib
import json
import re
import sys
from pathlib import Path

FILES = {
    '.claude-plugin/plugin.json',
    '.claude-plugin/marketplace.json',
    '.mcp.json',
    '.github/workflows/release.yml',
    'skills/lumiere-research/SKILL.md',
    'scripts/validate-plugin.py',
    'README.md',
    'LICENSE',
    'CHANGELOG.md',
}


def version_tuple(value):
    if not isinstance(value, str) or not re.fullmatch(r'(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)', value):
        raise ValueError('Plugin version must be a stable MAJOR.MINOR.PATCH version')
    return tuple(map(int, value.split('.')))


def validate(root):
    actual = set()
    for path in root.rglob('*'):
        relative = path.relative_to(root)
        if relative.parts[0] == '.git':
            continue
        if path.is_symlink():
            raise ValueError(f'Symlinks cannot be distributed: {relative}')
        if path.is_file():
            actual.add(relative.as_posix())
    if actual != FILES | {'release.json'}:
        raise ValueError(f'Unexpected/missing public files: {actual ^ (FILES | {"release.json"})}')
    manifest = json.loads((root / '.claude-plugin/plugin.json').read_text())
    version_tuple(manifest['version'])
    if manifest['name'] != 'lumiere' or manifest['license'] != 'MIT':
        raise ValueError('Unexpected plugin identity or license')
    mcp = json.loads((root / '.mcp.json').read_text())
    if mcp != {'mcpServers': {'lumiere': {'type': 'http', 'url': 'https://lumiere.ai/app/api/mcp'}}}:
        raise ValueError('Only the production OAuth MCP endpoint may be published')
    marketplace = json.loads((root / '.claude-plugin/marketplace.json').read_text())
    if marketplace['name'] != 'lumiere-plugins' or len(marketplace['plugins']) != 1:
        raise ValueError('Unexpected marketplace')
    entry = marketplace['plugins'][0]
    if entry['name'] != 'lumiere' or entry['source'] != './':
        raise ValueError('Marketplace must refer to this plugin')
    skill = (root / 'skills/lumiere-research/SKILL.md').read_text()
    if not skill.startswith('---\nname: lumiere-research\ndescription: ') or '\n---\n' not in skill[4:]:
        raise ValueError('Skill frontmatter is missing or invalid')
    if f"## {manifest['version']}\n" not in (root / 'CHANGELOG.md').read_text():
        raise ValueError('Add a changelog entry for this version')
    release = json.loads((root / 'release.json').read_text())
    if release['version'] != manifest['version'] or not re.fullmatch('[0-9a-f]{40}', release['source_commit']):
        raise ValueError('Release version or source commit is invalid')
    hashes = {name: hashlib.sha256((root / name).read_bytes()).hexdigest() for name in sorted(FILES)}
    if release['files'] != hashes:
        raise ValueError('Release file hashes do not match the distribution')
    return release


if __name__ == '__main__':
    release = validate(Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve())
    print(f"Validated Lumiere {release['version']} ({len(release['files'])} public files)")
