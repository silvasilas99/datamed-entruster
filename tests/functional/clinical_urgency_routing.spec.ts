import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import FhirResourceMetadata from '#models/fhir_resource_metadata'
import ElasticsearchService from '#services/elasticsearch_service'
import CouchdbService from '#services/couchdb_service'
import RedisHotCacheService from '#services/redis_hot_cache_service'

test.group('Clinical Urgency Routing & ES vs CouchDB', (group) => {
  const es = ElasticsearchService.getInstance()
  const couch = CouchdbService.getInstance()
  const redis = RedisHotCacheService.getInstance()

  let patientId: string
  let resourceId: string
  let metaId: string

  group.setup(async () => {
    await es.ensureIndices()
    try {
      await couch.ensureDatabase()
    } catch {
      // CouchDB pode estar offline em ambientes sem compose completo
    }

    patientId = randomUUID()
    resourceId = `obs-${randomUUID().slice(0, 8)}`

    // Sem patientId/institutionId no SQLite (FKs); o vínculo clínico fica nos índices e no Redis
    const metadata = await FhirResourceMetadata.create({
      resourceId,
      resourceType: 'Observation',
      versionId: '1',
      status: 'final',
      indexedAt: DateTime.now(),
    })
    metaId = metadata.id

    const doc = {
      id: metaId,
      resourceId,
      resourceType: 'Observation',
      status: 'final',
      versionId: '1',
      patientId,
      institutionId: null,
      indexedAt: DateTime.now().toISO(),
      updatedAt: DateTime.now().toISO(),
      createdAt: DateTime.now().toISO(),
    }

    await es.indexMetadata(doc)
    await es.getClient().indices.refresh({ index: 'fhir_metadata' })

    try {
      await couch.indexMetadata(doc)
    } catch {
      // opcional
    }

    await redis.set(patientId, [doc])
  })

  group.teardown(async () => {
    await redis.del(patientId)
    await es.removeMetadata(metaId).catch(() => {})
    await couch.removeMetadata(metaId).catch(() => {})
    await FhirResourceMetadata.query().where('id', metaId).delete().catch(() => {})
    await redis.disconnect()
  })

  test('GET /api/v1/clinical/metadata/:hash com EMER → HIGH e Redis hot cache', async ({
    client,
    assert,
  }) => {
    const response = await client
      .get(`/api/v1/clinical/metadata/${patientId}`)
      .header('X-Encounter-Class', 'EMER')
      .header('X-FHIR-Resource', 'AllergyIntolerance')
      .header('X-User-Role', 'EmergencyPhysician')

    response.assertStatus(200)
    const body = response.body()
    assert.isString(body.auditEventId)
    assert.isNotEmpty(body.auditEventId)
    assert.equal(body.priority, 'HIGH')
    assert.isAtLeast(body.cuiScore, 75)
    assert.equal(body.result.source, 'REDIS_HOT_NODE')
    assert.isArray(body.result.data)
  })

  test('GET /api/v1/clinical/metadata/:hash com BUS/Auditor → BACKGROUND (Elasticsearch)', async ({
    client,
    assert,
  }) => {
    const response = await client
      .get(`/api/v1/clinical/metadata/${patientId}`)
      .header('X-Encounter-Class', 'BUS')
      .header('X-FHIR-Resource', 'AuditEvent')
      .header('X-User-Role', 'Auditor')
      .qs({ resourceType: 'Observation', patientId })

    response.assertStatus(200)
    const body = response.body()
    assert.isString(body.auditEventId)
    assert.isNotEmpty(body.auditEventId)
    assert.equal(body.priority, 'BACKGROUND')
    assert.isBelow(body.cuiScore, 30)
    assert.include(['ELASTICSEARCH_SEARCH_NODE', 'COUCHDB_STATE_DB'], body.result.source)
  })

  test('GET /api/v1/benchmark/compare-search retorna métricas ES vs CouchDB', async ({
    client,
    assert,
  }) => {
    const health = await client.get('/api/v1/benchmark/health')
    health.assertStatus(200)

    const response = await client
      .get('/api/v1/benchmark/compare-search')
      .qs({ resourceType: 'Observation', patientId })

    response.assertStatus(200)
    const body = response.body()
    assert.property(body, 'elasticsearch')
    assert.property(body, 'couchdb')
    assert.property(body, 'comparison')
    assert.property(body.elasticsearch, 'latencyMs')
    assert.property(body.couchdb, 'latencyMs')
  })
})
