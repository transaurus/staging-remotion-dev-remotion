#!/usr/bin/env bash
set -euo pipefail

# prepare.sh for remotion-dev/remotion
# Docusaurus 3.9.2 at packages/docs
# Package manager: bun@1.3.3 (MUST be 1.3.3 — 1.3.11+ produces incomplete bundle stubs)
# Clones repo, installs deps, builds workspace packages, applies patches and content fixes.
# Does NOT run write-translations or build.

REPO_URL="https://github.com/remotion-dev/remotion"
BRANCH="main"
REPO_DIR="source-repo"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== prepare.sh: remotion-dev/remotion ==="

# --- Node 20 ---
export NVM_DIR="$HOME/.nvm"
if [ ! -f "$NVM_DIR/nvm.sh" ]; then
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
fi
source "$NVM_DIR/nvm.sh"
nvm install 20
nvm use 20
echo "Node version: $(node --version)"

# --- bun 1.3.3 ---
# bun 1.3.11+ has a bundler regression that produces stub ESM files (only re-export headers)
# instead of full bundles. This breaks downstream packages like @remotion/serverless-client.
curl -fsSL https://bun.sh/install | bash -s "bun-v1.3.3"
export PATH="$HOME/.bun/bin:$PATH"
echo "Bun version: $(bun --version)"

# --- Clone (skip if already exists) ---
if [ ! -d "$REPO_DIR" ]; then
  echo "Cloning $REPO_URL (depth 1, branch $BRANCH)..."
  git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$REPO_DIR"
  echo "Clone complete."
else
  echo "source-repo/ already exists, skipping clone."
fi

cd "$REPO_DIR"

# --- Apply fixes.json if present ---
FIXES_JSON="$SCRIPT_DIR/fixes.json"
if [ -f "$FIXES_JSON" ]; then
  echo "[INFO] Applying content fixes from fixes.json..."
  node -e "
  const fs = require('fs');
  const path = require('path');
  const fixes = JSON.parse(fs.readFileSync('$FIXES_JSON', 'utf8'));
  for (const [file, ops] of Object.entries(fixes.fixes || {})) {
      if (!fs.existsSync(file)) { console.log('  skip (not found):', file); continue; }
      let content = fs.readFileSync(file, 'utf8');
      for (const op of ops) {
          if (op.type === 'replace' && content.includes(op.find)) {
              content = content.split(op.find).join(op.replace || '');
              console.log('  fixed:', file, '-', op.comment || '');
          } else if (op.type === 'replace') {
              console.log('  skip (find not found):', file, '-', op.comment || '');
          }
      }
      fs.writeFileSync(file, content);
  }
  for (const [file, cfg] of Object.entries(fixes.newFiles || {})) {
      const c = typeof cfg === 'string' ? cfg : cfg.content;
      fs.mkdirSync(path.dirname(file), {recursive: true});
      fs.writeFileSync(file, c);
      console.log('  created:', file);
  }
  "
fi

# --- Fix type:'link' duplicate keys in sidebars.ts ---
# Docusaurus 3.9.2 requires unique 'key' attributes for identical labels in the same sidebar.
# These type:'link' items have duplicate labels — add explicit 'key' attributes.
echo "Applying sidebar type:link key fixes..."
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
        print(f"  WARNING: Could not add key for href={href}")
    else:
        print(f"  Added key '{key}' to link href='{href}'")
    return new_content

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

with open('packages/docs/sidebars.ts', 'w') as f:
    f.write(content)

print("Link key fixes applied.")
PYEOF

# --- Install all dependencies at monorepo root ---
# This resolves workspace:* deps across packages
echo "Installing dependencies at monorepo root..."
bun install --frozen-lockfile || bun install

# --- Build workspace packages that docs depends on ---
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

# --- Patch @remotion/docusaurus-plugin for graceful twoslash error handling ---
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

# --- Pre-build steps (must run before docusaurus build) ---
cd packages/docs

# copy-raw-docs.ts copies docs to static/_raw/docs (needed for build)
echo "Running copy-raw-docs.ts..."
bun copy-raw-docs.ts

# fetch-prompt-submissions.ts fetches external data — stub it to avoid network dependency
echo "Stubbing prompt-submissions.json..."
mkdir -p static/_raw
echo "[]" > static/_raw/prompt-submissions.json

# prewarm-twoslash.ts is a cache pre-warmer, not required for build

echo "[DONE] Repository is ready for docusaurus commands."
