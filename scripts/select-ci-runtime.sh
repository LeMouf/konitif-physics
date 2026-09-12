#!/usr/bin/env bash
set -euo pipefail
: "${RUNNER_TOOL_CACHE:?Runner cache required}"
: "${GITHUB_PATH:?GitHub path required}"
physics_node_bin="${RUNNER_TOOL_CACHE}/node/24.20.0/x64/bin"
test -x "${physics_node_bin}/node"
test -x "${physics_node_bin}/npm"
export PATH="${physics_node_bin}:${PATH}"
test "$(node --version)" = v24.20.0
printf '%s\n' "${physics_node_bin}" >> "${GITHUB_PATH}"
