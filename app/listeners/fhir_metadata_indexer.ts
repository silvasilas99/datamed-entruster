import type FhirMetadataSaved from '#events/fhir_metadata_saved'
import type FhirMetadataDeleted from '#events/fhir_metadata_deleted'
import ElasticsearchService from '#services/elasticsearch_service'
import CouchdbService from '#services/couchdb_service'
import RedisHotCacheService from '#services/redis_hot_cache_service'
import logger from '@adonisjs/core/services/logger'

/**
 * Mantém Elasticsearch + CouchDB (espelho do state DB) sincronizados
 * com as mudanças nos metadados FHIR. Invalida o hot-cache Redis do paciente.
 */
export default class FhirMetadataIndexer {
  private es = ElasticsearchService.getInstance()
  private couch = CouchdbService.getInstance()
  private redis = RedisHotCacheService.getInstance()

  async handleSaved({ metadata }: FhirMetadataSaved): Promise<void> {
    const doc = {
      id: metadata.id,
      resourceId: metadata.resourceId,
      resourceType: metadata.resourceType,
      status: metadata.status,
      versionId: metadata.versionId,
      patientId: metadata.patientId,
      institutionId: metadata.institutionId,
      indexedAt: metadata.indexedAt?.toISO() ?? null,
      updatedAt: metadata.updatedAt?.toISO() ?? null,
      createdAt: metadata.createdAt?.toISO() ?? null,
    }

    try {
      await this.es.indexMetadata(doc)
      logger.debug(
        `[ES] Documento indexado: ${metadata.id} (${metadata.resourceType}/${metadata.resourceId})`
      )
    } catch (error) {
      logger.error({ err: error }, `[ES] Falha ao indexar documento ${metadata.id}`)
    }

    try {
      await this.couch.indexMetadata(doc)
      logger.debug(`[CouchDB] Documento indexado: ${metadata.id}`)
    } catch (error) {
      logger.error({ err: error }, `[CouchDB] Falha ao indexar documento ${metadata.id}`)
    }

    if (metadata.patientId) {
      await this.redis.del(metadata.patientId)
    }
  }

  async handleDeleted({ metadataId }: FhirMetadataDeleted): Promise<void> {
    try {
      await this.es.removeMetadata(metadataId)
      logger.debug(`[ES] Documento removido: ${metadataId}`)
    } catch (error) {
      logger.error({ err: error }, `[ES] Falha ao remover documento ${metadataId}`)
    }

    try {
      await this.couch.removeMetadata(metadataId)
      logger.debug(`[CouchDB] Documento removido: ${metadataId}`)
    } catch (error) {
      logger.error({ err: error }, `[CouchDB] Falha ao remover documento ${metadataId}`)
    }
  }
}
