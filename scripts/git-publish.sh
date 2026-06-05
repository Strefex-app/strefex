#!/usr/bin/env bash
# Local terminal helper for commit + push. Cursor agent should commit only; user runs push.
# Commit and/or push with fail-fast auth, timeout, and clear diagnostics.
# Usage:
#   ./scripts/git-publish.sh --message "feat: …"           # commit tracked changes + push
#   ./scripts/git-publish.sh --message "…" --paths "src/"  # commit specific paths + push
#   ./scripts/git-publish.sh --push-only                   # push existing commits only
#   ./scripts/git-publish.sh --message "…" --no-push       # commit only
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

MESSAGE=""
PUSH_ONLY=0
NO_PUSH=0
PATHS=""
PUSH_TIMEOUT="${GIT_PUBLISH_TIMEOUT:-120}"
REMOTE="${GIT_PUBLISH_REMOTE:-origin}"
BRANCH="${GIT_PUBLISH_BRANCH:-$(git branch --show-current)}"

usage() {
  cat <<'EOF'
Usage: scripts/git-publish.sh [options]

Options:
  --message MSG     Commit message (required unless --push-only)
  --paths GLOB      Space-separated paths to stage (default: all tracked modifications)
  --push-only       Skip commit; push existing local commits
  --no-push         Commit only; do not push
  --remote NAME     Remote name (default: origin)
  --branch NAME     Branch name (default: current branch)
  -h, --help        Show this help

Environment:
  GIT_PUBLISH_TIMEOUT  Push timeout in seconds (default: 120)
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --message) MESSAGE="${2:-}"; shift 2 ;;
    --paths) PATHS="${2:-}"; shift 2 ;;
    --push-only) PUSH_ONLY=1; shift ;;
    --no-push) NO_PUSH=1; shift ;;
    --remote) REMOTE="${2:-}"; shift 2 ;;
    --branch) BRANCH="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
  esac
done

run_with_timeout() {
  local secs="$1"
  shift
  if command -v gtimeout >/dev/null 2>&1; then
    gtimeout "$secs" "$@"
  elif command -v timeout >/dev/null 2>&1; then
    timeout "$secs" "$@"
  else
    perl -e 'alarm shift; exec @ARGV' "$secs" "$@"
  fi
}

print_status() {
  echo "── git status ──"
  git status -sb
  echo
}

if [[ "$PUSH_ONLY" -eq 0 ]]; then
  if [[ -z "$MESSAGE" ]]; then
    echo "error: --message is required unless using --push-only" >&2
    exit 1
  fi

  print_status

  if [[ -n "$PATHS" ]]; then
    # shellcheck disable=SC2086
    git add -- $PATHS
  else
    if git diff --quiet && git diff --cached --quiet; then
      if [[ -n "$(git ls-files --others --exclude-standard)" ]]; then
        echo "note: only untracked files present; stage paths explicitly with --paths if intended"
      else
        echo "nothing to commit"
      fi
    else
      git add -u
    fi
  fi

  if ! git diff --cached --quiet; then
    git commit -m "$MESSAGE"
    echo "committed: $(git log -1 --oneline)"
  else
    echo "no staged changes to commit"
  fi
  echo
fi

if [[ "$NO_PUSH" -eq 1 ]]; then
  print_status
  exit 0
fi

AHEAD="$(git rev-list --count "${REMOTE}/${BRANCH}..${BRANCH}" 2>/dev/null || echo "0")"
if [[ "$AHEAD" -eq 0 ]]; then
  echo "nothing to push — ${BRANCH} is up to date with ${REMOTE}/${BRANCH}"
  print_status
  exit 0
fi

echo "── pushing ${AHEAD} commit(s) to ${REMOTE}/${BRANCH} ──"
git log "${REMOTE}/${BRANCH}..${BRANCH}" --oneline || true
echo

export GIT_TERMINAL_PROMPT=0
export GIT_HTTP_VERSION=1.1

set +e
PUSH_OUTPUT="$(run_with_timeout "$PUSH_TIMEOUT" git push "$REMOTE" "$BRANCH" 2>&1)"
PUSH_EXIT=$?
set -e

printf '%s\n' "$PUSH_OUTPUT"

if [[ "$PUSH_EXIT" -eq 0 ]]; then
  echo
  echo "push succeeded"
  print_status
  exit 0
fi

echo >&2
echo "push failed (exit ${PUSH_EXIT})" >&2

if [[ "$PUSH_EXIT" -eq 124 ]] || [[ "$PUSH_OUTPUT" == *"timed out"* ]] || [[ "$PUSH_OUTPUT" == *"Operation timed out"* ]]; then
  echo "hint: push timed out after ${PUSH_TIMEOUT}s — check VPN/network, then retry:" >&2
  echo "  git push ${REMOTE} ${BRANCH}" >&2
elif [[ "$PUSH_OUTPUT" == *"could not read Username"* ]] || [[ "$PUSH_OUTPUT" == *"Authentication failed"* ]] || [[ "$PUSH_OUTPUT" == *"terminal prompts disabled"* ]]; then
  echo "hint: GitHub credentials are not available in this environment." >&2
  echo "  Run in the integrated terminal (uses macOS Keychain):" >&2
  echo "  git push ${REMOTE} ${BRANCH}" >&2
else
  echo "hint: retry from the integrated terminal:" >&2
  echo "  git push ${REMOTE} ${BRANCH}" >&2
fi

exit "$PUSH_EXIT"
