#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

log() {
  printf '\033[1;36m[start-local]\033[0m %s\n' "$*"
}

fail() {
  printf '\033[1;31m[start-local]\033[0m %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Comando obrigatorio nao encontrado: $1"
}

pick_python() {
  local candidates=()

  if [[ -n "${PYTHON_BIN:-}" ]]; then
    candidates+=("$PYTHON_BIN")
  fi

  candidates+=("python3.12" "python3.11" "python3" "python")

  local candidate
  for candidate in "${candidates[@]}"; do
    if command -v "$candidate" >/dev/null 2>&1; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  return 1
}

require_cmd npm

PYTHON_CMD="$(pick_python)" || fail "Nenhum interpretador Python compativel foi encontrado."

if [[ ! -d node_modules ]]; then
  log "Instalando dependencias do frontend..."
  npm install
fi

if [[ ! -d .venv ]]; then
  log "Criando ambiente virtual Python em .venv..."
  "$PYTHON_CMD" -m venv .venv
fi

if [[ ! -x .venv/bin/python ]]; then
  fail "Nao foi possivel localizar .venv/bin/python."
fi

export PYTHON_BIN="$ROOT_DIR/.venv/bin/python"

if ! "$PYTHON_BIN" -c 'import uvicorn, fastapi' >/dev/null 2>&1; then
  log "Instalando dependencias do backend..."
  "$PYTHON_BIN" -m pip install --upgrade pip
  "$PYTHON_BIN" -m pip install -r backend/requirements.txt
fi

if [[ ! -f .env ]]; then
  log "Aviso: arquivo .env nao encontrado. Ajuste as variaveis se o projeto exigir configuracao especifica."
  export APP_ENV="${APP_ENV:-dev}"
  export NODE_ENV="${NODE_ENV:-dev}"
  export DB_DIALECT="${DB_DIALECT:-mock}"
  export ALLOW_ORACLE_SEED_FALLBACK="${ALLOW_ORACLE_SEED_FALLBACK:-true}"
  export AUTH_PROVIDER="${AUTH_PROVIDER:-local_jwt}"
  export AUTH_PASSWORD_LOGIN_ENABLED="${AUTH_PASSWORD_LOGIN_ENABLED:-true}"
  export ENABLE_DEMO_AUTH="${ENABLE_DEMO_AUTH:-true}"
  export RAG_ENABLED="${RAG_ENABLED:-false}"
  log "Aplicando perfil local sem .env: mock + demo auth + RAG desabilitado."
fi

log "Subindo frontend e API local..."
log "Frontend: http://localhost:3000"
log "API: http://localhost:4000"
log "Login local: admin@atlasgrid.ai / password123"

npm run dev:local
