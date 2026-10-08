import type { HttpContext } from '@adonisjs/core/http'
import { clinicalUrgencyConfig } from '#config/clinical_urgency'
import RedisHotCacheService from '#services/redis_hot_cache_service'
import ElasticsearchService, {
  type FhirMetadataDocument,
  type MetadataSearchParams,
} from '#services/elasticsearch_service'
import CouchdbService from '#services/couchdb_service'
import FhirResourceMetadata from '#models/fhir_resource_metadata'

export type RoutedQueryResult = {
  source: 'REDIS_HOT_NODE' | 'STATE_DB_PRIMARY' | 'READ_REPLICA_LEAST_LOADED' | 'ELASTICSEARCH_SEARCH_NODE' | 'COUCHDB_STATE_DB'
  latencyTarget?: string
  latencyMs: number
  data: FhirMetadataDocument[]
  meta?: Record<string, unknown>
}

/**
 * Roteamento dinâmico ciente de urgência clínica:
 *  - HIGH       → Redis hot cache (<15ms alvo), fallback State DB (SQLite)
 *  - STANDARD   → State DB / réplica primária
 *  - BACKGROUND → Elasticsearch (com throttling sob carga) — tráfego administrativo
 */
export default class DynamicRoutingService {
  private redis = RedisHotCacheService.getInstance()
  private elastic = ElasticsearchService.getInstance()
  private couch = CouchdbService.getInstance()

  public async routeQuery(
    ctx: HttpContext,
    patientHash: string,
    queryParams: MetadataSearchParams
  ): Promise<RoutedQueryResult> {
    const priority = ctx.urgencyPriority
    const started = performance.now()

    if (priority === 'HIGH') {
      const cached = await this.redis.get<FhirMetadataDocument[]>(patientHash)
      if (cached) {
        return {
          source: 'REDIS_HOT_NODE',
          latencyTarget: '<15ms',
          latencyMs: Math.round(performance.now() - started),
          data: cached,
        }
      }

      const data = await this.queryPrimaryStateDb(patientHash, queryParams)
      await this.redis.set(patientHash, data)
      return {
        source: 'STATE_DB_PRIMARY',
        latencyTarget: '<15ms',
        latencyMs: Math.round(performance.now() - started),
        data,
      }
    }

    if (priority === 'STANDARD') {
      const data = await this.queryPrimaryStateDb(patientHash, queryParams)
      return {
        source: 'READ_REPLICA_LEAST_LOADED',
        latencyMs: Math.round(performance.now() - started),
        data,
      }
    }

    // BACKGROUND — offload para Elasticsearch com backpressure
    if (await this.isSystemOverloaded()) {
      await new Promise((resolve) =>
        setTimeout(resolve, clinicalUrgencyConfig.throttling.backgroundDelayMs)
      )
    }

    const params: MetadataSearchParams = {
      ...queryParams,
      patientId: queryParams.patientId || patientHash,
    }

    try {
      const result = await this.elastic.searchMetadata(params)
      return {
        source: 'ELASTICSEARCH_SEARCH_NODE',
        latencyMs: Math.round(performance.now() - started),
        data: result.data,
        meta: result.meta,
      }
    } catch {
      // Fallback CouchDB (state DB rich-query) se ES estiver indisponível
      const result = await this.couch.searchMetadata(params)
      return {
        source: 'COUCHDB_STATE_DB',
        latencyMs: Math.round(performance.now() - started),
        data: result.data,
        meta: result.meta,
      }
    }
  }

  /**
   * Compara a mesma consulta em Elasticsearch e CouchDB, retornando métricas lado a lado.
   */
  public async compareElasticVsCouchdb(params: MetadataSearchParams = {}) {
    const elasticStarted = performance.now()
    let elasticResult: Awaited<ReturnType<ElasticsearchService['searchMetadata']>> | null = null
    let elasticError: string | null = null
    try {
      elasticResult = await this.elastic.searchMetadata(params)
    } catch (error) {
      elasticError = (error as Error).message
    }
    const elasticMs = Math.round(performance.now() - elasticStarted)

    const couchStarted = performance.now()
    let couchResult: Awaited<ReturnType<CouchdbService['searchMetadata']>> | null = null
    let couchError: string | null = null
    try {
      couchResult = await this.couch.searchMetadata(params)
    } catch (error) {
      couchError = (error as Error).message
    }
    const couchMs = Math.round(performance.now() - couchStarted)

    return {
      elasticsearch: {
        latencyMs: elasticMs,
        hitCount: elasticResult?.data.length ?? 0,
        total: elasticResult?.meta.total ?? 0,
        error: elasticError,
      },
      couchdb: {
        latencyMs: couchMs,
        hitCount: couchResult?.data.length ?? 0,
        total: couchResult?.meta.total ?? 0,
        error: couchError,
      },
      comparison: {
        fasterSource:
          elasticError && couchError
            ? null
            : elasticError
              ? 'couchdb'
              : couchError
                ? 'elasticsearch'
                : elasticMs <= couchMs
                  ? 'elasticsearch'
                  : 'couchdb',
        deltaMs: Math.abs(elasticMs - couchMs),
        speedupFactor:
          elasticError || couchError || Math.min(elasticMs, couchMs) === 0
            ? null
            : Number((Math.max(elasticMs, couchMs) / Math.min(elasticMs, couchMs)).toFixed(2)),
      },
    }
  }

  private async queryPrimaryStateDb(
    patientHash: string,
    params: MetadataSearchParams
  ): Promise<FhirMetadataDocument[]> {
    const query = FhirResourceMetadata.query()

    if (patientHash && patientHash !== '_') {
      query.where('patientId', patientHash)
    } else if (params.patientId) {
      query.where('patientId', params.patientId)
    }

    if (params.resourceType) query.where('resourceType', params.resourceType)
    if (params.status) query.where('status', params.status)
    if (params.resourceId) query.where('resourceId', params.resourceId)
    if (params.institutionId) query.where('institutionId', params.institutionId)

    const limit = Math.min(params.limit || 20, 100)
    const rows = await query.limit(limit)

    return rows.map((row) => ({
      id: row.id,
      resourceId: row.resourceId,
      resourceType: row.resourceType,
      status: row.status,
      versionId: row.versionId,
      patientId: row.patientId,
      institutionId: row.institutionId,
      indexedAt: row.indexedAt?.toISO() ?? null,
      updatedAt: row.updatedAt?.toISO() ?? null,
      createdAt: row.createdAt?.toISO() ?? null,
    }))
  }

  private async isSystemOverloaded(): Promise<boolean> {
    // Heurística simples: se Redis estiver indisponível sob carga de emergência, considera sobrecarga
    const redisOk = await this.redis.ping()
    return !redisOk
  }
}
