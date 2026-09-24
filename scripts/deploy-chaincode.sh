#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CHAINCODE_DIR="${ROOT_DIR}/chaincode"
CC_NAME="${FABRIC_CHAINCODE:-fhirchaincode}"
CC_VERSION="${CC_VERSION:-1.2}"
CC_SEQUENCE="${CC_SEQUENCE:-3}"
CHANNEL="${FABRIC_CHANNEL:-fhirchannel}"
LABEL="${CC_NAME}_${CC_VERSION}"
PACKAGE_FILE="/tmp/${LABEL}.tgz"
FABRIC_CONTAINER="${FABRIC_CONTAINER:-datamed_entruster-fabric-1}"

echo "==> Installing chaincode deps"
(cd "${CHAINCODE_DIR}" && npm install --omit=dev)

echo "==> Copying chaincode into Microfab container"
docker exec -u root "${FABRIC_CONTAINER}" rm -rf /tmp/fhirchaincode
docker exec "${FABRIC_CONTAINER}" mkdir -p /tmp/fhirchaincode
docker cp "${CHAINCODE_DIR}/index.js" "${FABRIC_CONTAINER}:/tmp/fhirchaincode/index.js"
docker cp "${CHAINCODE_DIR}/polyfill.js" "${FABRIC_CONTAINER}:/tmp/fhirchaincode/polyfill.js"
docker cp "${CHAINCODE_DIR}/package.json" "${FABRIC_CONTAINER}:/tmp/fhirchaincode/package.json"
docker cp "${CHAINCODE_DIR}/package-lock.json" "${FABRIC_CONTAINER}:/tmp/fhirchaincode/package-lock.json"
docker cp "${CHAINCODE_DIR}/lib" "${FABRIC_CONTAINER}:/tmp/fhirchaincode/lib"
docker exec -u root "${FABRIC_CONTAINER}" chown -R ibp-user:ibp-user /tmp/fhirchaincode

echo "==> Packaging chaincode"
docker exec "${FABRIC_CONTAINER}" peer lifecycle chaincode package "${PACKAGE_FILE}" \
  --path /tmp/fhirchaincode \
  --lang node \
  --label "${LABEL}"

PEER_ENV=(
  -e CORE_PEER_LOCALMSPID=Org1MSP
  -e CORE_PEER_MSPCONFIGPATH=/opt/microfab/data/admin-org1
  -e CORE_PEER_ADDRESS=127.0.0.1:2004
  -e CORE_PEER_TLS_ENABLED=false
  -e FABRIC_CFG_PATH=/opt/fabric/config
)

echo "==> Installing chaincode on Org1 peer"
INSTALL_OUT="$(docker exec "${PEER_ENV[@]}" "${FABRIC_CONTAINER}" peer lifecycle chaincode install "${PACKAGE_FILE}" 2>&1 || true)"
echo "${INSTALL_OUT}"
PACKAGE_ID="$(echo "${INSTALL_OUT}" | sed -n 's/.*Package ID: //p' | awk '{print $1}' | head -1)"

if [[ -z "${PACKAGE_ID}" ]]; then
  PACKAGE_ID="$(docker exec "${PEER_ENV[@]}" "${FABRIC_CONTAINER}" peer lifecycle chaincode queryinstalled \
    | sed -n "s/.*Package ID: \\(${LABEL}:[^,]*\\).*/\\1/p" | head -1)"
fi

echo "Package ID: ${PACKAGE_ID}"

if [[ -z "${PACKAGE_ID}" ]]; then
  echo "Failed to determine package ID" >&2
  exit 1
fi

echo "==> Approving chaincode definition"
docker exec "${PEER_ENV[@]}" "${FABRIC_CONTAINER}" peer lifecycle chaincode approveformyorg \
  --channelID "${CHANNEL}" \
  --name "${CC_NAME}" \
  --version "${CC_VERSION}" \
  --package-id "${PACKAGE_ID}" \
  --sequence "${CC_SEQUENCE}" \
  --waitForEvent

echo "==> Committing chaincode definition"
docker exec "${PEER_ENV[@]}" "${FABRIC_CONTAINER}" peer lifecycle chaincode commit \
  --channelID "${CHANNEL}" \
  --name "${CC_NAME}" \
  --version "${CC_VERSION}" \
  --sequence "${CC_SEQUENCE}" \
  --peerAddresses 127.0.0.1:2004 \
  --waitForEvent

echo "==> Chaincode ${CC_NAME} deployed on ${CHANNEL}"
