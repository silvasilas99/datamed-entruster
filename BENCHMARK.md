# Benchmark Report — DataMed Entruster

Relatório consolidado de métricas de escrita/leitura on-chain (`seed:metadata`), Clinical Urgency Routing (Redis / State DB / Elasticsearch) e comparação **Elasticsearch vs CouchDB**.

---

## Ambiente

| Item | Valor |
| :--- | :---- |
| Data (seed on-chain) | 2026-09-25T05:52:30Z |
| Data (CUI + ES vs CouchDB) | 2026-09-25T14:14:55Z |
| Rede Fabric | test-network (Org1MSP + Org2MSP) |
| Canal | `mychannel` |
| Chaincode | `fhir_chaincode` v1.0 |
| Peer gRPC | `host.docker.internal:7051` (TLS) |
| Elasticsearch | 8.13.0 (`fhir_metadata`, `institutions`) |
| Redis | 7-alpine (hot-cache CUI HIGH) |
| CouchDB | 3.3.3 (`fhir_metadata`, consultas Mango) |
| Persistência local | SQLite (`tmp/db.sqlite3`) |
| Runtime | container `datamed_entruster-api-1` (AdonisJS 7 / Node 24) |
| Host | WSL2 / Docker |

---

## Como reproduzir

Pré-requisitos: ambiente no ar e migrações aplicadas. Ver [`docs/SETUP.md`](docs/SETUP.md).

```bash
docker compose up -d --build
docker exec datamed_entruster-api-1 node ace migration:run
docker exec datamed_entruster-api-1 node ace elastic:sync

# Seed on-chain (atualiza a seção Write/Read blockchain abaixo)
docker exec datamed_entruster-api-1 node ace seed:metadata --count 250

# Comparação ES vs CouchDB
curl -s "http://localhost:3333/api/v1/benchmark/compare-search?resourceType=Patient&limit=10" | jq

# Load test k6 (emergência + auditoria + compare)
k6 run load-tests/k6/clinical_urgency.js \
  -e BASE_URL=http://localhost:3333 \
  -e PATIENT_ID=<uuid-do-paciente>
```

O `seed:metadata`:

1. Cria um pool de instituições e pacientes (FK)
2. Gera metadados FHIR (`Patient`, `Observation`, `DiagnosticReport`, `Condition`)
3. Persiste no SQLite (eventos indexam no Elasticsearch e CouchDB)
4. Submete `CreateMetadata` on-chain
5. Amostra até 100 leituras on-chain (`ReadMetadata`)
6. Atualiza as métricas de escrita/leitura blockchain neste arquivo

---

## 1. Seed configuration (on-chain)

- Resource types: Patient, Observation, DiagnosticReport, Condition
- Records per type: **250**
- Total records: **1000**

## 2. Write performance (Fabric + SQLite + indexação)

Inclui SQLite + indexação Elasticsearch (+ CouchDB via listener) + transação Fabric por registro.

| Métrica | Valor |
| :------ | :---- |
| Total time | **2 285 096 ms** (~38,1 min) |
| Throughput | **0,44 records/s** |
| Average latency per record | **2 285,10 ms** |

> O gargalo dominante é a latência de endorsement/commit na test-network (escrita on-chain ~2,3 s/registro neste ambiente WSL2/Docker).

## 3. Read performance (Blockchain)

Leituras via `evaluateTransaction` (`ReadMetadata`), amostragem dos IDs criados no seed.

| Métrica | Valor |
| :------ | :---- |
| Sampled reads | **100** |
| Total read time | **364 ms** |
| Read throughput | **274,73 reads/s** |
| Average read latency | **3,64 ms** |

## 4. Disk usage

| Métrica | Valor |
| :------ | :---- |
| Approximate SQLite file size | **0,59 MB** (~608 KiB) |

---

## 5. Clinical Urgency Routing (CUI)

Medições via `GET /api/v1/clinical/metadata/:patientHash` com headers de urgência (paciente existente no seed).

| Cenário | Headers | CUI | Prioridade | Source | Latência |
| :--- | :--- | ---: | :--- | :--- | ---: |
| Emergência (1ª leitura / warm) | `EMER` + `AllergyIntolerance` + `EmergencyPhysician` | 100 | `HIGH` | `STATE_DB_PRIMARY` → depois `REDIS_HOT_NODE` | ~11 ms → **0 ms** (cache hit) |
| Emergência (cache hit) | idem | 100 | `HIGH` | `REDIS_HOT_NODE` | **0 ms** |
| Auditoria | `BUS` + `AuditEvent` + `Auditor` | 12 | `BACKGROUND` | `ELASTICSEARCH_SEARCH_NODE` | **5 ms** |

Fórmula: \\(CUI = (0{,}5\\,W_{ctx} + 0{,}3\\,W_{res} + 0{,}2\\,W_{rol}) \\times 100\\).

| Prioridade | Limiar | Destino |
| :--- | :--- | :--- |
| HIGH | \\(\\ge 75\\) | Redis hot-cache (TTL 30 min), fallback SQLite |
| STANDARD | \\([30, 75)\\) | State DB (SQLite) |
| BACKGROUND | \\(< 30\\) | Elasticsearch (+ throttling sob sobrecarga) |

```bash
# Smoke
curl -s http://localhost:3333/api/v1/benchmark/health | jq
# {"elasticsearch":true,"couchdb":true,"redis":true,"healthy":true}
```

---

## 6. Elasticsearch vs CouchDB (rich-query)

Endpoint: `GET /api/v1/benchmark/compare-search?resourceType=Patient&limit=10`

Amostra de **5** execuções sequenciais (2026-09-25T14:14:55Z), após `elastic:sync` parcial no CouchDB:

| Backend | Latência média | Min | Max | Hits (página) | Total estimado |
| :--- | ---: | ---: | ---: | ---: | ---: |
| **Elasticsearch** | **5,4 ms** | 5 ms | 6 ms | 10 | 508 |
| **CouchDB** (Mango) | **7,8 ms** | 7 ms | 8 ms | 10 | 20* |

\\(\\text{speedup}\\_\\text{factor} \\approx 1{,}44\\) (ES mais rápido nesta amostra; `fasterSource=elasticsearch` em 5/5).

> \\* O total CouchDB pode ficar abaixo do ES até um `elastic:sync` completo espelhar todo o corpus. Em cargas analiticamente maiores (texto livre / fuzziness), a vantagem relativa do Elasticsearch tende a crescer — o CouchDB aqui modela a rich-query do state DB do Fabric.

```bash
curl -s "http://localhost:3333/api/v1/benchmark/compare-search?resourceType=Patient&limit=10" | jq '{
  elasticsearch, couchdb, comparison
}'
```

Exemplo de resposta:

```json
{
  "elasticsearch": { "latencyMs": 5, "hitCount": 10, "total": 508, "error": null },
  "couchdb": { "latencyMs": 8, "hitCount": 10, "total": 20, "error": null },
  "comparison": {
    "fasterSource": "elasticsearch",
    "deltaMs": 3,
    "speedupFactor": 1.6
  }
}
```

---

## 7. Load tests k6 (emergência × auditoria)

Script: [`load-tests/k6/clinical_urgency.js`](load-tests/k6/clinical_urgency.js)

| Cenário k6 | Tráfego simulado | Destino esperado | Thresholds |
| :--- | :--- | :--- | :--- |
| `emergency_spike` | Ramp 0→40 VUs | Redis (`REDIS_HOT_NODE`) | p95 &lt; 50 ms, p99 &lt; 100 ms |
| `audit_spike` | Ramp 0→30 VUs | Elasticsearch | p95 &lt; 500 ms |
| `es_vs_couchdb` | 5 VUs constantes | `compare-search` | success rate &gt; 95% |

```bash
k6 run load-tests/k6/clinical_urgency.js \
  -e BASE_URL=http://localhost:3333 \
  -e PATIENT_ID=<uuid>

# Relatórios: load-tests/k6/results/latest-summary.md
```

> O pacote `@jonis/jmeter` citado em `PLAN.md` **não existe no npm**. A suíte de carga usa **k6**; a integração AdonisJS 7 usa **Japa** (`npm run test:cui`).

---

## Observações

- Leituras on-chain (`evaluate`) são ordens de magnitude mais rápidas que escritas (`submit`), o que motiva o padrão CQRS / índice off-chain.
- O CUI isola emergência no Redis para não competir com varreduras analíticas de auditoria no Elasticsearch.
- CouchDB espelha documentos FHIR para comparar rich-query (padrão do world-state Fabric) versus o índice off-chain otimizado.
- Smoke seed rápido: `node ace seed:metadata --count 2` (8 registros; ~20 s nesta máquina).
- Relatório anterior de validação (`--count 2`): 8 writes em 20 497 ms (0,39 r/s); 8 reads em 42 ms (190,48 r/s).

*Seed on-chain gerado em 2026-09-25T05:52:30.046+00:00 por `seed:metadata --count 250`. Seção CUI / ES vs CouchDB atualizada em 2026-09-25T14:14:55Z.*
