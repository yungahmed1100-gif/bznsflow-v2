"""Validate local Codex configuration and project skill discovery without networking."""
from pathlib import Path
import re
import tomllib

root = Path(__file__).resolve().parents[2]
config = tomllib.loads((root / '.codex/config.toml').read_text())
servers = config['mcp_servers']
assert not servers['supabase']['enabled']
assert not servers['convex-blue']['enabled']
assert set(servers['convex-green']['enabled_tools']) == {'status', 'tables', 'functionSpec', 'insights'}
assert '--dangerously-enable-production-deployments' not in servers['convex-green']['args']
assert Path(servers['convex-green']['command']).is_file(), 'Install locked npm dependencies first'
assert Path(servers['convex-green']['args'][3]).resolve() == root, 'Update Convex project path after moving checkout'
for name, server in servers.items():
    assert 'env' not in server and 'http_headers' not in server, f'Inspect inline credentials in {name}'
    assert 'bearer_token' not in server
skills = sorted((root / '.agents/skills').glob('bznsflow-*/SKILL.md'))
assert len(skills) == 6
for path in skills:
    text = path.read_text()
    front = text.split('---', 2)[1]
    name = re.search(r'^name: (.+)$', front, re.M)
    description = re.search(r'^description: (.+)$', front, re.M)
    assert name and name[1] == path.parent.name
    assert description and len(description[1]) > 20
    assert len(text.split()) < 650, f'Keep entrypoint focused: {path}'
    for reference in re.findall(r'`((?:src|api|convex|config|scripts|tests|docs|\.codex)/[^`]+)`', text):
        assert (root / reference).exists(), f'Missing reference: {reference}'
print(f'Valid project TOML, {len(servers)} MCP entries and {len(skills)} discoverable skills.')
