#!/usr/bin/env bash
# Ralph-Wiggum-Schleife für STU-Parität – über den lokalen Modell-Proxy (wie claudel/claudec).
#
# Aufruf aus dem Repo-Root (eigener Branch/Worktree, nicht main):
#   bash .scratch/stu-parity/ralph.sh [-p litellm|copilot] [-m MODEL] [-s SMALL_MODEL] [-n MAX_ITER]
#
#   -p  Proxy: litellm = http://127.0.0.1:4000 (claudel), copilot = http://127.0.0.1:4141 (claudec). Default: litellm
#   -m  Primärmodell (sonst einmalige Auswahl per fzf, wie bei claudel/claudec)
#   -s  Small/Fast-Modell (Default: Primärmodell bzw. fzf-Auswahl)
#   -n  Maximale Anzahl Durchläufe (Default: 20)
#
# Umgebungsvariablen: RALPH_KEY_FILE (Default: ~/.config/sops-nix/secrets/litellm_master_key),
#                     RALPH_MAX_RETRIES (Default: 5) für Proxy-/API-Fehler je Durchlauf.
set -euo pipefail

PROXY="litellm"
MODEL=""
SMALL=""
MAX=20
while getopts "p:m:s:n:h" opt; do
  case "$opt" in
    p) PROXY="$OPTARG" ;;
    m) MODEL="$OPTARG" ;;
    s) SMALL="$OPTARG" ;;
    n) MAX="$OPTARG" ;;
    *) sed -n '2,15p' "$0"; exit 1 ;;
  esac
done

case "$PROXY" in
  litellm) BASE="http://127.0.0.1:4000" ;;
  copilot) BASE="http://127.0.0.1:4141" ;;
  http*)   BASE="$PROXY" ;;
  *) echo "Unbekannter Proxy: $PROXY" >&2; exit 1 ;;
esac

KEY_FILE="${RALPH_KEY_FILE:-$HOME/.config/sops-nix/secrets/litellm_master_key}"
KEY="$(cat "$KEY_FILE")"
MAX_RETRIES="${RALPH_MAX_RETRIES:-5}"

DIR=".scratch/stu-parity"
LOG_DIR="$DIR/logs"
mkdir -p "$LOG_DIR"

branch="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$branch" == "main" ]]; then
  echo "Bitte nicht auf main laufen lassen: git switch -c stu-parity" >&2
  exit 1
fi

proxy_models() {
  curl -fsS --max-time 10 -H "Authorization: Bearer $KEY" "$BASE/v1/models" | jq -r '[.data[].id] | unique | .[]'
}

wait_for_proxy() {
  local tries=0
  until proxy_models >/dev/null 2>&1; do
    tries=$((tries + 1))
    if ((tries > MAX_RETRIES)); then
      echo "Proxy $BASE nach $MAX_RETRIES Versuchen nicht erreichbar – Abbruch." >&2
      exit 2
    fi
    echo "Proxy $BASE nicht erreichbar, neuer Versuch in $((tries * 30))s …" >&2
    sleep $((tries * 30))
  done
}

wait_for_proxy

# Modelle einmalig wählen (statt bei jedem Durchlauf wie in claudel/claudec)
if [[ -z "$MODEL" ]]; then
  MODEL="$(proxy_models | fzf --no-sort --height=~20 --border=rounded --border-label=' Select primary model ' --prompt='> ')"
fi
if [[ -z "$SMALL" ]]; then
  SMALL="$(proxy_models | fzf --no-sort --height=~20 --border=rounded --border-label=' Select small/fast model ' --prompt='> ')" || SMALL="$MODEL"
fi
echo "Proxy: $BASE  primary: $MODEL  small: $SMALL"

export ANTHROPIC_BASE_URL="$BASE"
export ANTHROPIC_AUTH_TOKEN="$KEY"
export ANTHROPIC_MODEL="$MODEL"
export ANTHROPIC_DEFAULT_SONNET_MODEL="$MODEL"
export ANTHROPIC_DEFAULT_OPUS_MODEL="$MODEL"
export ANTHROPIC_SMALL_FAST_MODEL="$SMALL"
export ANTHROPIC_DEFAULT_HAIKU_MODEL="$SMALL"
export CLAUDE_CODE_SUBAGENT_MODEL="$MODEL"
export DISABLE_NON_ESSENTIAL_MODEL_CALLS=1
export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1

for ((i = 1; i <= MAX; i++)); do
  if grep -qs RALPH_DONE "$DIR/ralph-status.md"; then
    echo "Backlog leer – fertig nach $((i - 1)) Durchläufen."
    exit 0
  fi

  attempt=0
  while :; do
    wait_for_proxy
    head_before="$(git rev-parse HEAD)"
    log="$LOG_DIR/run-$(date +%Y%m%d-%H%M%S).jsonl"
    echo "=== Ralph-Durchlauf $i/$MAX, Versuch $((attempt + 1)) ($(date '+%F %T')) → $log ==="
    # --dangerously-skip-permissions nur in isolierter Umgebung (Worktree/Container) verwenden.
    if command claude -p "$(cat "$DIR/PROMPT.md")" \
      --model "$MODEL" \
      --dangerously-skip-permissions \
      --output-format stream-json --verbose \
      >"$log" 2>&1; then
      break
    fi
    # API-/Proxyfehler: erneut versuchen. Ein abgebrochener Claim wird im nächsten Versuch fortgesetzt (siehe PROMPT.md).
    if grep -qiE 'api error|server_error|overloaded|rate.?limit|ECONNREFUSED|no such host|timed? ?out|HTTP 5[0-9][0-9]' "$log"; then
      attempt=$((attempt + 1))
      if ((attempt > MAX_RETRIES)); then
        echo "Durchlauf $i nach $MAX_RETRIES API-Fehlern abgebrochen – Schleife stoppt." >&2
        exit 3
      fi
      echo "API-/Proxyfehler, neuer Versuch in $((attempt * 60))s …" >&2
      sleep $((attempt * 60))
      continue
    fi
    echo "Durchlauf $i mit Fehler beendet (kein API-Fehler) – siehe $log" >&2
    break
  done

  if [[ "$(git rev-parse HEAD)" == "$head_before" ]]; then
    echo "Warnung: Durchlauf $i hat keinen Commit erzeugt." >&2
  fi
  git log --oneline -1
done
echo "Maximale Anzahl Durchläufe ($MAX) erreicht."
