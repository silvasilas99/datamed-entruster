# Setup de ambiente — DataMed Entruster

Guia para provisionar a stack completa usada pelo DataMed Entruster:

- Rede permissionada **Hyperledger Fabric** (test-network + chaincode `fhir_chaincode`)
- **Elasticsearch** (busca off-chain / CQRS)
- **Redis** (hot-cache do Clinical Urgency Routing)
- **CouchDB** (espelho rich-query para benchmark vs Elasticsearch)
- **API AdonisJS 7**

A forma recomendada é o Docker Compose. O serviço `fabric-bootstrap` automatiza o equivalente à seção Fabric deste documento.

---

## Via Docker Compose (recomendado)

### Pré-requisitos no host

- Docker e Docker Compose v2
- Binários Fabric em `fabric-samples/bin` (primeira vez: seção [Instalação dos binários](#instalação-dos-binários-fabric-primeira-vez))
- Imagens Docker do Fabric (o `network.sh` faz pull se necessário)
- Executar os comandos a partir da raiz do repositório (`PWD` é usado nos volume mounts)
- Node.js `>= 22` (preferencialmente `>= 24`) se for rodar a API ou testes no host

### Subir o ambiente completo

API + Elasticsearch + Redis + CouchDB + rede Fabric + deploy do chaincode:

```bash
docker compose up -d --build
```

Serviços:

| Serviço | Função | Porta |
| :--- | :--- | :--- |
| `fabric-bootstrap` | Compila chaincode, sobe test-network, canal `mychannel`, deploy `fhir_chaincode` (encerra ao concluir) | — |
| `elasticsearch` | Índice off-chain `fhir_metadata` / `institutions` | `9200` |
| `redis` | Hot-cache CUI prioridade HIGH | `6379` |
| `couchdb` | Espelho Mango para benchmark ES vs state-DB | `5984` |
| `api` | API AdonisJS (aguarda bootstrap Fabric) | `3333` |

O `fabric-bootstrap`:

1. Compila o chaincode em `chaincode/`
2. Sobe a test-network e cria o canal `mychannel`
3. Faz deploy do chaincode `fhir_chaincode` (Org1 + Org2, sequence automática)
4. Encerra com sucesso; a API sobe em seguida e conecta via TLS em `host.docker.internal:7051`

### Pós-subida (migrações e índices)

```bash
docker exec datamed_entruster-api-1 node ace migration:run
docker exec datamed_entruster-api-1 node ace elastic:sync
```

`elastic:sync` agora:

1. Garante índices Elasticsearch
2. Cria a database CouchDB `fhir_metadata` + índices Mango
3. Espelha instituições e metadados FHIR do SQLite nos dois backends

### Verificar saúde dos backends

```bash
curl -s http://localhost:3333/api/v1/benchmark/health | jq
# Esperado: {"elasticsearch":true,"couchdb":true,"redis":true,"healthy":true}
```

### Seed e métricas de benchmark

Gera instituições/pacientes, grava metadados no SQLite, registra na blockchain, indexa no Elasticsearch/CouchDB (via eventos) e atualiza a seção de seed em [`BENCHMARK.md`](../BENCHMARK.md):

```bash
# 250 por tipo × 4 tipos = 1000 registros (pode levar vários minutos)
docker exec datamed_entruster-api-1 node ace seed:metadata --count 250

# Validação rápida
docker exec datamed_entruster-api-1 node ace seed:metadata --count 2
```

### Clinical Urgency Routing — smoke test

```bash
# Emergência (CUI HIGH → Redis após 1ª leitura)
curl -s -H "X-Encounter-Class: EMER" \
  -H "X-FHIR-Resource: AllergyIntolerance" \
  -H "X-User-Role: EmergencyPhysician" \
  "http://localhost:3333/api/v1/clinical/metadata/<patient-uuid>" | jq '.priority,.result.source,.result.latencyMs'

# Auditoria (CUI BACKGROUND → Elasticsearch)
curl -s -H "X-Encounter-Class: BUS" \
  -H "X-FHIR-Resource: AuditEvent" \
  -H "X-User-Role: Auditor" \
  "http://localhost:3333/api/v1/clinical/metadata/<patient-uuid>?resourceType=Patient" | jq '.priority,.result.source,.result.latencyMs'

# Comparação ES vs CouchDB
curl -s "http://localhost:3333/api/v1/benchmark/compare-search?resourceType=Patient&limit=10" | jq
```

### Load tests (k6)

```bash
# Instalar: https://grafana.com/docs/k6/latest/set-up/install-k6/
k6 run load-tests/k6/clinical_urgency.js \
  -e BASE_URL=http://localhost:3333 \
  -e PATIENT_ID=<uuid-do-paciente>
```

Detalhes: [`load-tests/README.md`](../load-tests/README.md).

### Variáveis relevantes (compose / `.env`)

| Variável | Valor padrão |
|---|---|
| `FABRIC_MODE` | `test-network` |
| `FABRIC_CHANNEL` | `mychannel` |
| `FABRIC_CHAINCODE` | `fhir_chaincode` |
| `FABRIC_ENDPOINT` | `host.docker.internal:7051` (API no compose) / `localhost:7051` (host) |
| `FABRIC_PEER_HOST_OVERRIDE` | `peer0.org1.example.com` |
| `FABRIC_MSP_ID` | `Org1MSP` |
| `FABRIC_CRYPTO_PATH` | `/fabric/organizations` (API no compose) |
| `ELASTICSEARCH_URL` | `http://elasticsearch:9200` (compose) / `http://localhost:9200` (host) |
| `REDIS_HOST` | `redis` (compose) / `127.0.0.1` (host) |
| `REDIS_PORT` | `6379` |
| `REDIS_OPTIONAL` | `true` |
| `COUCHDB_URL` | `http://couchdb:5984` (compose) / `http://localhost:5984` (host) |
| `COUCHDB_USERNAME` | `admin` |
| `COUCHDB_PASSWORD` | `password` |
| `COUCHDB_METADATA_DB` | `fhir_metadata` |

> Se o volume `api_node_modules` estiver desatualizado após puxar dependências novas (`ioredis`, `nano`), rode `docker compose exec api npm install` e reinicie a API.

### Reprovisionar só a rede Fabric

```bash
docker compose run --rm fabric-bootstrap
```

Ou no host (mesmo script):

```bash
./scripts/fabric-bootstrap.sh
```

O script é **idempotente**: se canal e chaincode já estiverem saudáveis, não recria a rede.

### Derrubar serviços

```bash
# API + Elasticsearch + Redis + CouchDB
docker compose down

# Rede Fabric (peers / orderer)
cd fabric-samples/test-network
./network.sh down
```

> `docker compose down` **não** remove os containers da test-network; use `network.sh down` para isso.

---

## Instalação dos binários Fabric (primeira vez)

```bash
git clone https://github.com/hyperledger/fabric-samples.git
cd fabric-samples
curl -sSL https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh | bash -s -- binary docker
cd ..
```

Isso popula `fabric-samples/bin` e faz pull das imagens Docker oficiais.

---

## Passo a passo manual (equivalente ao bootstrap)

### Compilar chaincode

```bash
cd chaincode
npm install
npm run build
cd ..
```

### Subir rede + canal + deploy

```bash
./scripts/fabric-bootstrap.sh
```

Alternativa com scripts oficiais da test-network:

```bash
cd fabric-samples/test-network
./network.sh up createChannel -c mychannel
./network.sh deployCC -c mychannel -ccn fhir_chaincode -ccp ../../chaincode -ccl typescript -ccv 1.0 -ccs auto
cd ../..
```

> Preferir `-ccs auto` em vez de package IDs / sequence fixos (evita os valores hardcoded do fluxo manual antigo).

### Subir apenas Redis / CouchDB / Elasticsearch (host)

```bash
docker compose up -d redis couchdb elasticsearch
```

### Consultas manuais Fabric (após a rede no ar)

Defina as variáveis da Org1:

```bash
cd fabric-samples/test-network
export PATH=$PATH:$(pwd)/../bin
export FABRIC_CFG_PATH=$PWD/../config/
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=$PWD/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=$PWD/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051
export ORDERER_CA=$PWD/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
```

Transação de criação de metadados:

```bash
peer chaincode invoke -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --channelID mychannel \
  --name fhir_chaincode \
  --tls \
  --cafile ${ORDERER_CA} \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
  --peerAddresses localhost:9051 \
  --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt \
  -c '{"Args":["CreateMetadata", "{\"resourceId\":\"patient-01\", \"resourceType\":\"Patient\", \"status\":\"active\"}"]}'
```

Query:

```bash
peer chaincode query \
  -C mychannel \
  -n fhir_chaincode \
  -c '{"Args":["GetAllMetadata"]}'
```

---

## Troubleshooting

| Sintoma | Causa comum | Ação |
|---|---|---|
| `ledger [mychannel] already exists` após recreate | Volumes `compose_*` não removidos | `./network.sh down` e `docker volume rm` dos volumes `compose_orderer` / `compose_peer0.org*` |
| API não conecta ao peer | Crypto regenerado / path errado | Conferir `FABRIC_CRYPTO_PATH` e remontar `organizations/` |
| `FOREIGN KEY constraint failed` no seed | Paciente/instituição inexistentes | O `seed:metadata` atual cria o pool de FKs automaticamente |
| Bootstrap usa `docker-compose` v1 | Cliente legado | A imagem `fabric-bootstrap` força Compose v2 (`docker compose`) |
| `Cannot find package 'ioredis'` / `nano` na API | Volume `api_node_modules` desatualizado | `docker compose exec api npm install` e `docker compose restart api` |
| `benchmark/health` com `redis:false` | Redis fora do ar ou `REDIS_HOST` errado | `docker compose up -d redis`; no Compose use `REDIS_HOST=redis` |
| `benchmark/health` com `couchdb:false` | CouchDB fora do ar / credenciais | `docker compose up -d couchdb`; conferir `COUCHDB_URL` / user / password |
| CouchDB `hitCount: 0` no compare-search | Espelho ainda não sincronizado | `node ace elastic:sync` (ou gravar novos metadados para disparar o listener) |
| Testes Japa travam ao sair | Cliente Redis mantém o event loop | Use `npm run test:cui` (teardown chama `redis.disconnect`) ou `--force-exit` |
