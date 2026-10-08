#!/usr/bin/env bash
# Automates docs/SETUP.md: build chaincode, bring up Fabric test-network, deploy fhir_chaincode.
# Note: do not use `set -u` — fabric-samples scripts reference optional vars (OVERRIDE_ORG, VERBOSE, …).
set -eo pipefail

ROOT_DIR="${COMPOSE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
TEST_NETWORK_DIR="${ROOT_DIR}/fabric-samples/test-network"
CHAINCODE_DIR="${ROOT_DIR}/chaincode"
CHANNEL_NAME="${FABRIC_CHANNEL:-mychannel}"
CC_NAME="${FABRIC_CHAINCODE:-fhir_chaincode}"
CC_VERSION="${FABRIC_CC_VERSION:-1.0}"

export PATH="${ROOT_DIR}/fabric-samples/bin:${PATH}"
# Force Compose V2 plugin — docker-compose v1 breaks fabric-samples YAML and volume cleanup
export CONTAINER_CLI=docker
export CONTAINER_CLI_COMPOSE="docker compose"

log() { echo "[fabric-bootstrap] $*"; }
die() { echo "[fabric-bootstrap] ERROR: $*" >&2; exit 1; }

require_bin() {
  command -v "$1" >/dev/null 2>&1 || die "Required binary not found: $1"
}

peers_running() {
  docker ps --format '{{.Names}}' | grep -qx 'peer0.org1.example.com'
}

orderer_running() {
  docker ps --format '{{.Names}}' | grep -qx 'orderer.example.com'
}

remove_fabric_volumes() {
  # network.sh hardcodes docker_* names; compose project dir is often "compose" → compose_*
  local vols
  vols="$(docker volume ls -q | grep -E '^(docker|compose)_(orderer|peer0\.org1|peer0\.org2)\.example\.com$' || true)"
  if [[ -n "${vols}" ]]; then
    log "Removing Fabric peer/orderer volumes"
    # shellcheck disable=SC2086
    docker volume rm ${vols} || true
  fi
}

chaincode_committed() {
  pushd "${TEST_NETWORK_DIR}" >/dev/null
  export FABRIC_CFG_PATH="${ROOT_DIR}/fabric-samples/config"
  # shellcheck disable=SC1091
  source scripts/envVar.sh
  setGlobals 1
  local ok=0
  if peer lifecycle chaincode querycommitted \
    --channelID "${CHANNEL_NAME}" \
    --name "${CC_NAME}" >/dev/null 2>&1; then
    ok=1
  fi
  popd >/dev/null
  [[ "${ok}" -eq 1 ]]
}

channel_joined() {
  pushd "${TEST_NETWORK_DIR}" >/dev/null
  export FABRIC_CFG_PATH="${ROOT_DIR}/fabric-samples/config"
  # shellcheck disable=SC1091
  source scripts/envVar.sh
  setGlobals 1
  local ok=0
  if peer channel getinfo -c "${CHANNEL_NAME}" >/dev/null 2>&1; then
    ok=1
  fi
  popd >/dev/null
  [[ "${ok}" -eq 1 ]]
}

build_chaincode() {
  log "Building chaincode at ${CHAINCODE_DIR}"
  pushd "${CHAINCODE_DIR}" >/dev/null
  if [[ -f package-lock.json ]]; then
    npm ci
  else
    npm install
  fi
  npm run build
  popd >/dev/null
}

ensure_fabric_binaries() {
  if [[ -x "${ROOT_DIR}/fabric-samples/bin/peer" ]]; then
    log "Fabric binaries already present"
    return
  fi
  die "Fabric binaries missing under fabric-samples/bin. Run install-fabric.sh binary docker once on the host."
}

network_healthy() {
  peers_running && orderer_running && channel_joined && chaincode_committed
}

bring_up_network() {
  pushd "${TEST_NETWORK_DIR}" >/dev/null

  if network_healthy; then
    log "Fabric network already healthy (channel=${CHANNEL_NAME}, chaincode=${CC_NAME})"
    popd >/dev/null
    return
  fi

  if peers_running && orderer_running && channel_joined; then
    log "Network/channel up; chaincode will be deployed next"
    popd >/dev/null
    return
  fi

  log "Resetting and starting test-network with channel ${CHANNEL_NAME}"
  ./network.sh down || true
  remove_fabric_volumes
  ./network.sh up createChannel -c "${CHANNEL_NAME}"
  popd >/dev/null
}

deploy_chaincode() {
  pushd "${TEST_NETWORK_DIR}" >/dev/null
  export FABRIC_CFG_PATH="${ROOT_DIR}/fabric-samples/config"

  if chaincode_committed; then
    log "Chaincode ${CC_NAME} already committed on ${CHANNEL_NAME}; skipping deploy"
    popd >/dev/null
    return
  fi

  log "Deploying chaincode ${CC_NAME} (typescript) to ${CHANNEL_NAME}"
  ./network.sh deployCC \
    -c "${CHANNEL_NAME}" \
    -ccn "${CC_NAME}" \
    -ccp "${CHAINCODE_DIR}" \
    -ccl typescript \
    -ccv "${CC_VERSION}" \
    -ccs auto
  popd >/dev/null
}

smoke_query() {
  pushd "${TEST_NETWORK_DIR}" >/dev/null
  export FABRIC_CFG_PATH="${ROOT_DIR}/fabric-samples/config"
  # shellcheck disable=SC1091
  source scripts/envVar.sh
  setGlobals 1
  log "Smoke query GetAllMetadata"
  peer chaincode query \
    -C "${CHANNEL_NAME}" \
    -n "${CC_NAME}" \
    -c '{"Args":["GetAllMetadata"]}' || log "Smoke query returned non-zero (ledger may be empty); continuing"
  popd >/dev/null
}

main() {
  require_bin docker
  require_bin jq
  require_bin npm
  require_bin peer

  if ! docker compose version >/dev/null 2>&1; then
    die "docker compose (v2 plugin) is required"
  fi

  log "ROOT_DIR=${ROOT_DIR}"
  log "Using $(docker compose version)"
  ensure_fabric_binaries
  build_chaincode
  bring_up_network
  deploy_chaincode
  smoke_query
  log "Fabric permissioned network is ready (channel=${CHANNEL_NAME}, chaincode=${CC_NAME})"
}

main "$@"
