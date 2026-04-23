#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PRIMARY_NODE="/Users/ldwl/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
FALLBACK_NODE="/Applications/Codex.app/Contents/Resources/node"

if [ -x "$PRIMARY_NODE" ]; then
  NODE_BIN="$PRIMARY_NODE"
elif [ -x "$FALLBACK_NODE" ]; then
  NODE_BIN="$FALLBACK_NODE"
else
  echo "未找到可用的 Node 可执行文件。"
  echo "请先安装 Node，或者确认 Codex.app 仍在本机。"
  exit 1
fi

if [ -z "${BLTCY_BASE_URL:-}" ]; then
  echo "缺少 BLTCY_BASE_URL"
  exit 1
fi

if [ -z "${BLTCY_API_KEY:-}" ]; then
  echo "缺少 BLTCY_API_KEY"
  exit 1
fi

if [ -z "${BLTCY_MODEL:-}" ]; then
  export BLTCY_MODEL="gpt-5.4-nano"
fi

if [ -z "${ALLOW_ORIGIN:-}" ]; then
  export ALLOW_ORIGIN="*"
fi

cd "$ROOT_DIR"

echo "使用 Node: $NODE_BIN"
echo "正在启动自由对话预览服务..."
"$NODE_BIN" "$ROOT_DIR/local_preview_server.js" &
SERVER_PID=$!

cleanup() {
  if kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

sleep 1

echo "预览地址: http://127.0.0.1:3000/"
echo "健康检查: http://127.0.0.1:3000/health"
echo "按 Ctrl+C 停止服务。"

if command -v open >/dev/null 2>&1; then
  open "http://127.0.0.1:3000/"
fi

wait "$SERVER_PID"
