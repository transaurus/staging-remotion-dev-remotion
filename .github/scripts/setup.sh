#!/usr/bin/env bash
set -euo pipefail

# Setup script for remotion-dev/remotion
# Docusaurus 3.9.2 at packages/docs
# Package manager: bun@1.3.3 (MUST be 1.3.3 — 1.3.11+ produces incomplete bundle stubs)

REPO_URL="https://github.com/remotion-dev/remotion"
REPO_DIR="source-repo"
DOCS_DIR="packages/docs"

# Install Node 20
export NVM_DIR="$HOME/.nvm"
if [ ! -f "$NVM_DIR/nvm.sh" ]; then
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
fi
source "$NVM_DIR/nvm.sh"
nvm install 20
nvm use 20

NODE_VERSION=$(node --version)
echo "Node version: $NODE_VERSION"

# Install bun 1.3.3 specifically
# bun 1.3.11+ has a bundler regression that produces stub ESM files (only re-export headers)
# instead of full bundles. This breaks downstream packages like @remotion/serverless-client.
curl -fsSL https://bun.sh/install | bash -s "bun-v1.3.3"
export PATH="$HOME/.bun/bin:$PATH"

BUN_VERSION=$(bun --version)
echo "Bun version: $BUN_VERSION"

# Clone repo (already removed by caller, but be safe)
if [ -d "$REPO_DIR" ]; then
  rm -rf "$REPO_DIR"
fi
git clone --depth=1 "$REPO_URL" "$REPO_DIR"
cd "$REPO_DIR"

# Install all dependencies at the monorepo root
# This resolves workspace:* deps across packages
echo "Installing dependencies at monorepo root..."
bun install --frozen-lockfile || bun install

# Build all workspace packages that docs depends on.
# This includes: remotion core, @remotion/player, @remotion/transitions, @remotion/shapes,
# @remotion/renderer, @remotion/bundler, @remotion/docusaurus-plugin, etc.
# turbo respects ^make dependencies (builds in correct order).
# NODE_ENV=production is required by bundle.ts scripts in each package.
echo "Building workspace packages (turbo make)..."
TURBO_TELEMETRY_DISABLED=1 NODE_ENV=production \
  ./node_modules/.bin/turbo run make \
  --filter='docs^...' \
  --no-update-notifier \
  --continue

# Patch @remotion/docusaurus-plugin to degrade twoslash errors gracefully.
# When TypeScript types can't be resolved, twoslash sets node.type='html' in MDAST.
# This creates 'raw' HAST nodes which hast-util-to-estree@3.1.0 cannot handle.
# Fix: when twoslash fails, keep the node as a plain code block instead.
echo "Patching @remotion/docusaurus-plugin for graceful twoslash error handling..."
python3 - <<'PYEOF'
import sys

path = 'packages/docusaurus-plugin/dist/exceptionMessageDOM.js'
with open(path, 'r') as f:
    content = f.read()

old = "    node.type = 'html';\n    node.value = \"<div id='twoslash-error'>\" + css + html + '</div>';\n    node.children = [];"
new = "    // Degrade gracefully: keep node as a regular code block\n    // (avoids 'Cannot handle unknown node raw' in hast-util-to-estree@3.1.0)\n    // node.type stays 'code', node.value stays as the code"

if old not in content:
    print(f"WARNING: Could not find patch target in {path} — continuing anyway")
    sys.exit(0)

content = content.replace(old, new, 1)
with open(path, 'w') as f:
    f.write(content)
print("Patch applied successfully")
PYEOF

# Fix duplicate sidebar translation keys in sidebars.ts
# Docusaurus 3.9.2 requires unique 'key' attributes for identical labels in the same sidebar.
# These categories/links have duplicate labels — fix by adding explicit 'key' attributes.
echo "Applying sidebar key fixes..."
python3 - <<'PYEOF'
import re

with open('packages/docs/sidebars.ts', 'r') as f:
    content = f.read()

def add_key_to_link(content, href, key):
    """Add key to a type:'link' item identified by its unique href."""
    pattern = r"(type: 'link',\n(\s+))href: '" + re.escape(href) + r"',"
    replacement = r"\1key: '" + key + r"',\n\2href: '" + href + r"',"
    new_content = re.sub(pattern, replacement, content)
    if new_content == content:
        print(f"WARNING: Could not add key for href={href}")
    else:
        print(f"  Added key '{key}' to link href='{href}'")
    return new_content

def add_key_to_category_by_exact_pattern(content, old_pattern, new_pattern):
    """Add key using exact string replacement — pattern must be unique in file."""
    if old_pattern not in content:
        print(f"WARNING: Pattern not found for replacement: {old_pattern[:60]!r}")
        return content
    new_content = content.replace(old_pattern, new_pattern, 1)
    print(f"  Applied category key fix")
    return new_content

# Fix type:'link' items — all have unique hrefs
link_fixes = [
    # apiSidebar
    ('/docs/cloudrun/cli', 'cloudrun-cli-reference'),
    ('/docs/lambda/cli', 'lambda-cli-reference'),
    ('/docs/client-side-rendering', 'web-renderer-guide'),
    ('/docs/media-parser', 'media-parser-guide'),
    ('/docs/webcodecs', 'webcodecs-guide'),
    # mainSidebar
    ('/docs/web-renderer', 'web-renderer-api-reference'),
    ('/docs/lambda/api', 'lambda-api-reference'),
    ('/docs/player/player', 'player-api-reference'),
    ('/docs/api', 'main-api-reference'),
    ('/docs/media-parser/parse-media', 'media-parser-api-reference'),
    ('/docs/webcodecs/convert-media', 'webcodecs-api-reference'),
]

for href, key in link_fixes:
    content = add_key_to_link(content, href, key)

# Fix type:'category' items with duplicate labels
# Each replacement uses the unique doc id (in link) or first item to identify the block

# apiSidebar: 'sites' label appears twice (lambda and cloudrun CLI)
content = add_key_to_category_by_exact_pattern(
    content,
    "\t\t\t\t\t\t\ttype: 'category',\n\t\t\t\t\t\t\tlabel: 'sites',\n\t\t\t\t\t\t\tlink: {\n\t\t\t\t\t\t\t\ttype: 'doc',\n\t\t\t\t\t\t\t\tid: 'lambda/cli/sites',",
    "\t\t\t\t\t\t\ttype: 'category',\n\t\t\t\t\t\t\tkey: 'lambda-cli-sites',\n\t\t\t\t\t\t\tlabel: 'sites',\n\t\t\t\t\t\t\tlink: {\n\t\t\t\t\t\t\t\ttype: 'doc',\n\t\t\t\t\t\t\t\tid: 'lambda/cli/sites',"
)

content = add_key_to_category_by_exact_pattern(
    content,
    "\t\t\t\t\t\t\ttype: 'category',\n\t\t\t\t\t\t\tlabel: 'sites',\n\t\t\t\t\t\t\tlink: {\n\t\t\t\t\t\t\t\ttype: 'doc',\n\t\t\t\t\t\t\t\tid: 'cloudrun/cli/sites',",
    "\t\t\t\t\t\t\ttype: 'category',\n\t\t\t\t\t\t\tkey: 'cloudrun-cli-sites',\n\t\t\t\t\t\t\tlabel: 'sites',\n\t\t\t\t\t\t\tlink: {\n\t\t\t\t\t\t\t\ttype: 'doc',\n\t\t\t\t\t\t\t\tid: 'cloudrun/cli/sites',"
)

# mainSidebar: 'Troubleshooting' label appears three times
# Lambda Troubleshooting (5 tabs, has 'lambda/troubleshooting/debug')
content = add_key_to_category_by_exact_pattern(
    content,
    "\t\t\t\t\ttype: 'category',\n\t\t\t\t\tlabel: 'Troubleshooting',\n\t\t\t\t\titems: [\n\t\t\t\t\t\t'lambda/troubleshooting/debug',",
    "\t\t\t\t\ttype: 'category',\n\t\t\t\t\tkey: 'lambda-troubleshooting',\n\t\t\t\t\tlabel: 'Troubleshooting',\n\t\t\t\t\titems: [\n\t\t\t\t\t\t'lambda/troubleshooting/debug',"
)

# Main Troubleshooting (3 tabs, has 'troubleshooting/debug-failed-render')
content = add_key_to_category_by_exact_pattern(
    content,
    "\t\t\ttype: 'category',\n\t\t\tlabel: 'Troubleshooting',\n\t\t\titems: [\n\t\t\t\t'troubleshooting/debug-failed-render',",
    "\t\t\ttype: 'category',\n\t\t\tkey: 'main-troubleshooting',\n\t\t\tlabel: 'Troubleshooting',\n\t\t\titems: [\n\t\t\t\t'troubleshooting/debug-failed-render',"
)

# Recorder Troubleshooting (5 tabs, has 'recorder/troubleshooting/...')
content = add_key_to_category_by_exact_pattern(
    content,
    "\t\t\t\t\ttype: 'category',\n\t\t\t\t\tlabel: 'Troubleshooting',\n\t\t\t\t\titems: [\n\t\t\t\t\t\t'recorder/troubleshooting/cannot-read-properties-of-undefined',",
    "\t\t\t\t\ttype: 'category',\n\t\t\t\t\tkey: 'recorder-troubleshooting',\n\t\t\t\t\tlabel: 'Troubleshooting',\n\t\t\t\t\titems: [\n\t\t\t\t\t\t'recorder/troubleshooting/cannot-read-properties-of-undefined',"
)

with open('packages/docs/sidebars.ts', 'w') as f:
    f.write(content)

print("Sidebar fixes applied successfully")
PYEOF

echo "Running docusaurus write-translations..."
cd "$DOCS_DIR"
bun run docusaurus write-translations

echo "SUCCESS: write-translations completed"
ls -la i18n/ 2>/dev/null || echo "No i18n directory found"

echo "Running pre-build steps..."
# copy-raw-docs.ts copies docs to static/_raw/docs (needed for build)
bun copy-raw-docs.ts

# fetch-prompt-submissions.ts fetches external data — stub it to avoid network dependency
mkdir -p static/_raw
echo "[]" > static/_raw/prompt-submissions.json

# prewarm-twoslash.ts is a cache pre-warmer, not required for build output

echo "Running docusaurus build..."
DOCUSAURUS_IGNORE_SSG_WARNINGS=true ./node_modules/.bin/docusaurus build

echo "SUCCESS: build completed"
ls -la build/ 2>/dev/null || echo "No build directory found"
