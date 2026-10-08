#!/usr/bin/env bash
set -eo pipefail

ROOT_DIR="${COMPOSE_PROJECT_DIR:-/workspace}"
SCRIPT="${ROOT_DIR}/scripts/fabric-bootstrap.sh"

if [[ ! -f "${SCRIPT}" ]]; then
  echo "[fabric-bootstrap] Missing ${SCRIPT}" >&2
  exit 1
fi

export PATH="${ROOT_DIR}/fabric-samples/bin:${PATH}"
export COMPOSE_PROJECT_DIR="${ROOT_DIR}"
export CONTAINER_CLI=docker
export CONTAINER_CLI_COMPOSE="docker compose"

exec bash "${SCRIPT}"
