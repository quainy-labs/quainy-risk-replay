#!/usr/bin/env sh
set -eu

PACKAGE_SPEC="${QRR_PACKAGE_SPEC:-github:quainy-labs/quainy-risk-replay}"
REF="${QRR_REF:-}"
DRY_RUN="${QRR_DRY_RUN:-0}"

if [ -n "$REF" ] && ! printf "%s" "$PACKAGE_SPEC" | grep -q "#"; then
  PACKAGE_SPEC="${PACKAGE_SPEC}#${REF}"
fi

echo "Quainy Risk Replay installer"
echo "Package source: ${PACKAGE_SPEC}"

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js 22 or newer is required to run quainy-risk-replay." >&2
  echo "Install Node.js, then rerun this installer." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is required to install quainy-risk-replay." >&2
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "Error: Node.js 22 or newer is required. Found: $(node --version)" >&2
  exit 1
fi

echo "Node: $(node --version)"
echo "npm: $(npm --version)"

if [ "$DRY_RUN" = "1" ]; then
  echo "Dry run only. Would run:"
  echo "npm install -g ${PACKAGE_SPEC}"
  exit 0
fi

npm install -g "$PACKAGE_SPEC"

echo ""
echo "Installed quainy-risk-replay."
echo "Next steps:"
echo "  quainy-risk-replay --version"
echo "  quainy-risk-replay help"
echo "  cd /path/to/your-ai-project"
echo "  quainy-risk-replay init"
echo "  quainy-risk-replay generate"
echo "  quainy-risk-replay run"
echo ""
echo "Note: this installs the CLI only. The showcase web app lives in the Quainy Risk Replay repo checkout."
