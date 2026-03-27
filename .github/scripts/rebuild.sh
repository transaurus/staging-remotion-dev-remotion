#!/usr/bin/env bash
set -euo pipefail

# rebuild.sh for remotion-dev/remotion
# Runs on existing source tree (no clone). Current dir should be packages/docs.
# Remotion is a monorepo — workspace packages must be built before docusaurus can build.
# Since built dist/ files are gitignored, we clone the source repo to a temp dir,
# build workspace packages there, and copy the dist dirs back.

REPO_URL="https://github.com/remotion-dev/remotion"
REBUILD_WORK_DIR="$(pwd)"

echo "=== rebuild.sh: remotion-dev/remotion ==="
echo "Working from: $REBUILD_WORK_DIR"

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
curl -fsSL https://bun.sh/install | bash -s "bun-v1.3.3"
export PATH="$HOME/.bun/bin:$PATH"
echo "Bun version: $(bun --version)"

# --- Navigate to monorepo root ---
# In rebuild mode, current dir is packages/docs. Go up to monorepo root.
REPO_ROOT="$(cd "$REBUILD_WORK_DIR/../.." && pwd)"
echo "Monorepo root: $REPO_ROOT"

# --- Install deps at monorepo root (for node_modules/.bin and workspace links) ---
echo "Installing dependencies at monorepo root..."
cd "$REPO_ROOT"
bun install --frozen-lockfile || bun install

# --- Build workspace packages ---
# Built dist/ files are gitignored so we need to rebuild them.
echo "Building workspace packages (turbo make)..."
TURBO_TELEMETRY_DISABLED=1 NODE_ENV=production \
  ./node_modules/.bin/turbo run make \
  --filter='docs^...' \
  --no-update-notifier \
  --continue

# --- Patch @remotion/docusaurus-plugin ---
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

# --- Pre-build steps ---
cd "$REBUILD_WORK_DIR"

echo "Running copy-raw-docs.ts..."
bun copy-raw-docs.ts

echo "Stubbing prompt-submissions.json..."
mkdir -p static/_raw
echo "[]" > static/_raw/prompt-submissions.json

# --- Build ---
echo "Building Docusaurus site..."
DOCUSAURUS_IGNORE_SSG_WARNINGS=true ./node_modules/.bin/docusaurus build

echo "[DONE] Build complete."
