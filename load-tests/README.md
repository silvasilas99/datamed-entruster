# Load tests — Clinical Urgency Routing

> O pacote `@jonis/jmeter` mencionado em `PLAN.md` **não existe no npm**.  
> Este diretório usa **k6** (Grafana) para carga HTTP e **Japa** para testes de integração AdonisJS 7.

## Pré-requisitos

```bash
docker compose up -d --build
docker exec datamed_entruster-api-1 node ace migration:run
docker exec datamed_entruster-api-1 node ace elastic:sync
```

Instalar k6: https://grafana.com/docs/k6/latest/set-up/install-k6/

## Cenários

| Cenário | Headers | Destino esperado |
| :--- | :--- | :--- |
| `emergency_spike` | `EMER` + `AllergyIntolerance` + `EmergencyPhysician` | Redis hot cache (`REDIS_HOT_NODE`) |
| `audit_spike` | `BUS` + `AuditEvent` + `Auditor` | Elasticsearch (`ELASTICSEARCH_SEARCH_NODE`) |
| `es_vs_couchdb` | `GET /api/v1/benchmark/compare-search` | Métricas lado a lado ES vs CouchDB |

## Executar

```bash
# Smoke (~1 min)
k6 run load-tests/k6/clinical_urgency.js

# Com patient hash real (após seed)
k6 run load-tests/k6/clinical_urgency.js \
  -e BASE_URL=http://localhost:3333 \
  -e PATIENT_ID=<uuid-do-paciente>

# Pico mais agressivo
k6 run load-tests/k6/clinical_urgency.js --vus 80 --duration 2m
```

Relatórios são gravados em `load-tests/k6/results/`.

## Testes Japa (integração)

```bash
npm run test -- --files="tests/unit/cui_calculator.spec.ts"
npm run test -- --files="tests/functional/clinical_urgency_routing.spec.ts"
```

## Endpoint de comparação (sem k6)

```bash
curl -s "http://localhost:3333/api/v1/benchmark/compare-search?resourceType=Patient&limit=10" | jq
curl -s "http://localhost:3333/api/v1/benchmark/health" | jq
```
