/**
 * k6 load test — Clinical Urgency Routing
 *
 * Simula picos mistos de:
 *  - Emergência (CUI HIGH → Redis hot cache)
 *  - Auditoria/faturamento (CUI BACKGROUND → Elasticsearch)
 *  - Comparação direta Elasticsearch vs CouchDB
 *
 * Nota: o pacote `@jonis/jmeter` citado no PLAN.md não existe no npm.
 * Este projeto usa k6 (padrão de indústria) + testes Japa de integração.
 *
 * Pré-requisitos:
 *   docker compose up -d --build
 *   docker exec datamed_entruster-api-1 node ace migration:run
 *   # opcional: seed com alguns metadados
 *
 * Execução:
 *   k6 run load-tests/k6/clinical_urgency.js
 *   k6 run load-tests/k6/clinical_urgency.js -e BASE_URL=http://localhost:3333 -e PATIENT_ID=<uuid>
 *   k6 run load-tests/k6/clinical_urgency.js --vus 50 --duration 60s
 */

import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Trend, Counter, Rate } from 'k6/metrics'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3333'
const PATIENT_ID = __ENV.PATIENT_ID || '_'

const emergencyLatency = new Trend('emergency_latency_ms', true)
const auditLatency = new Trend('audit_latency_ms', true)
const elasticCompareLatency = new Trend('elastic_compare_latency_ms', true)
const couchCompareLatency = new Trend('couch_compare_latency_ms', true)
const emergencyCacheHits = new Counter('emergency_redis_hits')
const auditEsHits = new Counter('audit_elasticsearch_hits')
const successRate = new Rate('cui_success_rate')

export const options = {
  scenarios: {
    emergency_spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 20 },
        { duration: '30s', target: 40 },
        { duration: '15s', target: 0 },
      ],
      exec: 'emergencyTraffic',
      tags: { traffic: 'emergency' },
    },
    audit_spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 15 },
        { duration: '30s', target: 30 },
        { duration: '15s', target: 0 },
      ],
      exec: 'auditTraffic',
      startTime: '5s',
      tags: { traffic: 'audit' },
    },
    es_vs_couchdb: {
      executor: 'constant-vus',
      vus: 5,
      duration: '60s',
      exec: 'compareBackends',
      startTime: '10s',
      tags: { traffic: 'compare' },
    },
  },
  thresholds: {
    emergency_latency_ms: ['p(95)<50', 'p(99)<100'],
    audit_latency_ms: ['p(95)<500'],
    cui_success_rate: ['rate>0.95'],
    http_req_failed: ['rate<0.05'],
  },
}

export function emergencyTraffic() {
  group('emergency HIGH → Redis', () => {
    const res = http.get(`${BASE_URL}/api/v1/clinical/metadata/${PATIENT_ID}`, {
      headers: {
        'X-Encounter-Class': 'EMER',
        'X-FHIR-Resource': 'AllergyIntolerance',
        'X-User-Role': 'EmergencyPhysician',
        Accept: 'application/json',
      },
      tags: { name: 'clinical_emergency' },
    })

    emergencyLatency.add(res.timings.duration)
    const ok = check(res, {
      'emergency status 200': (r) => r.status === 200,
      'priority HIGH': (r) => {
        try {
          return r.json('priority') === 'HIGH'
        } catch {
          return false
        }
      },
    })
    successRate.add(ok)

    try {
      if (res.json('result.source') === 'REDIS_HOT_NODE') {
        emergencyCacheHits.add(1)
      }
    } catch {
      // ignore parse errors
    }
  })
  sleep(0.2)
}

export function auditTraffic() {
  group('audit BACKGROUND → Elasticsearch', () => {
    const res = http.get(
      `${BASE_URL}/api/v1/clinical/metadata/${PATIENT_ID}?resourceType=Patient&limit=20`,
      {
        headers: {
          'X-Encounter-Class': 'BUS',
          'X-FHIR-Resource': 'AuditEvent',
          'X-User-Role': 'Auditor',
          Accept: 'application/json',
        },
        tags: { name: 'clinical_audit' },
      }
    )

    auditLatency.add(res.timings.duration)
    const ok = check(res, {
      'audit status 200': (r) => r.status === 200,
      'priority BACKGROUND': (r) => {
        try {
          return r.json('priority') === 'BACKGROUND'
        } catch {
          return false
        }
      },
    })
    successRate.add(ok)

    try {
      const source = res.json('result.source')
      if (source === 'ELASTICSEARCH_SEARCH_NODE') auditEsHits.add(1)
    } catch {
      // ignore
    }
  })
  sleep(0.3)
}

export function compareBackends() {
  group('benchmark ES vs CouchDB', () => {
    const res = http.get(
      `${BASE_URL}/api/v1/benchmark/compare-search?resourceType=Patient&limit=10`,
      {
        headers: { Accept: 'application/json' },
        tags: { name: 'compare_search' },
      }
    )

    const ok = check(res, {
      'compare status 200': (r) => r.status === 200,
      'has elasticsearch metrics': (r) => {
        try {
          return typeof r.json('elasticsearch.latencyMs') === 'number'
        } catch {
          return false
        }
      },
      'has couchdb metrics': (r) => {
        try {
          return typeof r.json('couchdb.latencyMs') === 'number'
        } catch {
          return false
        }
      },
    })
    successRate.add(ok)

    try {
      elasticCompareLatency.add(Number(res.json('elasticsearch.latencyMs')))
      couchCompareLatency.add(Number(res.json('couchdb.latencyMs')))
    } catch {
      // ignore
    }
  })
  sleep(0.5)
}

export function handleSummary(data) {
  const es = data.metrics.elastic_compare_latency_ms
  const couch = data.metrics.couch_compare_latency_ms
  const emerg = data.metrics.emergency_latency_ms
  const audit = data.metrics.audit_latency_ms

  const lines = [
    '# k6 Clinical Urgency Load Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    `BASE_URL: ${BASE_URL}`,
    '',
    '## Emergency (HIGH / Redis)',
    `- p95: ${emerg?.values?.['p(95)']?.toFixed?.(2) ?? 'n/a'} ms`,
    `- p99: ${emerg?.values?.['p(99)']?.toFixed?.(2) ?? 'n/a'} ms`,
    `- avg: ${emerg?.values?.avg?.toFixed?.(2) ?? 'n/a'} ms`,
    '',
    '## Audit (BACKGROUND / Elasticsearch)',
    `- p95: ${audit?.values?.['p(95)']?.toFixed?.(2) ?? 'n/a'} ms`,
    `- avg: ${audit?.values?.avg?.toFixed?.(2) ?? 'n/a'} ms`,
    '',
    '## Elasticsearch vs CouchDB (server-side compare-search)',
    `- ES avg latency: ${es?.values?.avg?.toFixed?.(2) ?? 'n/a'} ms`,
    `- CouchDB avg latency: ${couch?.values?.avg?.toFixed?.(2) ?? 'n/a'} ms`,
    '',
  ]

  return {
    stdout: lines.join('\n'),
    'load-tests/k6/results/latest-summary.md': lines.join('\n'),
    'load-tests/k6/results/latest-summary.json': JSON.stringify(data, null, 2),
  }
}
