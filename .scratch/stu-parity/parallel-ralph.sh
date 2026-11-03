#!/usr/bin/env bash
# Parallel STU parity runner.
#
# Run from a clean, committed stu-parity branch:
#   bash .scratch/stu-parity/parallel-ralph.sh [-j JOBS] [-n MAX_TICKETS]
set -euo pipefail

PROXY="litellm"
MODEL=""
SMALL=""
JOBS=2
MAX_TICKETS=20
RESUME=""
EXTRA=()

usage() {
  sed -n '2,6p' "$0"
  printf '%s\n' "Options: -p PROXY -m MODEL -s SMALL_MODEL -j JOBS -n MAX_TICKETS --resume RUN_ID"
}

while (($#)); do
  case "$1" in
    -p) PROXY="${2:?missing proxy}"; shift 2 ;;
    -m) MODEL="${2:?missing model}"; shift 2 ;;
    -s) SMALL="${2:?missing small model}"; shift 2 ;;
    -j) JOBS="${2:?missing jobs}"; shift 2 ;;
    -n) MAX_TICKETS="${2:?missing max tickets}"; shift 2 ;;
    --resume) RESUME="${2:?missing run id}"; shift 2 ;;
    --skip-batch-verify) EXTRA+=("--skip-batch-verify"); shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

[[ "$JOBS" =~ ^[1-9][0-9]*$ ]] || { echo "JOBS must be positive" >&2; exit 2; }
[[ "$MAX_TICKETS" =~ ^[1-9][0-9]*$ ]] || { echo "MAX_TICKETS must be positive" >&2; exit 2; }

case "$PROXY" in
  litellm) BASE="http://127.0.0.1:4000" ;;
  copilot) BASE="http://127.0.0.1:4141" ;;
  http*) BASE="$PROXY" ;;
  *) echo "Unknown proxy: $PROXY" >&2; exit 2 ;;
esac

KEY_FILE="${RALPH_KEY_FILE:-$HOME/.config/sops-nix/secrets/litellm_master_key}"
KEY="${RALPH_AUTH_TOKEN:-${LITELLM_MASTER_KEY:-}}"
if [[ -z "$KEY" && -r "$KEY_FILE" ]]; then
  KEY="$(<"$KEY_FILE")"
fi
MAX_RETRIES="${RALPH_MAX_RETRIES:-5}"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"

proxy_models() {
  local auth=()
  if [[ -n "$KEY" ]]; then
    auth=(-H "Authorization: Bearer $KEY")
  fi
  curl -fsS --max-time 10 "${auth[@]}" "$BASE/v1/models" |
    jq -r '[.data[].id] | unique | .[]'
}

tries=0
until proxy_models >/dev/null 2>&1; do
  tries=$((tries + 1))
  if ((tries > MAX_RETRIES)); then
    echo "Proxy $BASE unavailable after $MAX_RETRIES attempts" >&2
    exit 3
  fi
  sleep $((tries * 10))
done

if [[ -z "$MODEL" ]]; then
  MODEL="$(proxy_models | fzf --no-sort --height=~20 --border=rounded --prompt='Primary model> ')"
fi
if [[ -z "$SMALL" ]]; then
  SMALL="$(proxy_models | fzf --no-sort --height=~20 --border=rounded --prompt='Small model> ')" || SMALL="$MODEL"
fi

export ANTHROPIC_BASE_URL="$BASE"
if [[ -n "$KEY" ]]; then
  export ANTHROPIC_AUTH_TOKEN="$KEY"
else
  unset ANTHROPIC_AUTH_TOKEN
fi
export ANTHROPIC_MODEL="$MODEL"
export ANTHROPIC_DEFAULT_SONNET_MODEL="$MODEL"
export ANTHROPIC_DEFAULT_OPUS_MODEL="$MODEL"
export ANTHROPIC_SMALL_FAST_MODEL="$SMALL"
export ANTHROPIC_DEFAULT_HAIKU_MODEL="$SMALL"
export CLAUDE_CODE_SUBAGENT_MODEL="$MODEL"
export DISABLE_NON_ESSENTIAL_MODEL_CALLS=1
export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1

args=(
  --repo "$REPO_ROOT"
  --jobs "$JOBS"
  --max-tickets "$MAX_TICKETS"
  --model "$MODEL"
  --small-model "$SMALL"
  --max-retries "$MAX_RETRIES"
)
if [[ -n "$RESUME" ]]; then
  args+=(--resume "$RESUME")
fi
args+=("${EXTRA[@]}")

exec python3 -I "$SCRIPT_DIR/parallel_ralph.py" "${args[@]}"
