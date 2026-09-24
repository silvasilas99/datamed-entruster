import FhirMetadataSaved from '#events/healthcare/fhir_metadata_saved'
import FhirMetadataDeleted from '#events/healthcare/fhir_metadata_deleted'
import ElasticsearchService from '#services/elasticsearch_service'
import logger from '@adonisjs/core/services/logger'

/**
 * Listener responsável por manter o índice Elasticsearch sincronizado
 * com as mudanças nos metadados FHIR persistidos no banco de dados.
 *
 * Reage a dois eventos:
 *  - FhirMetadataSaved  → indexa ou atualiza o documento
 *  - FhirMetadataDeleted → remove o documento do índice
 */
export default class FhirMetadataIndexer {
  private es = ElasticsearchService.getInstance()

  /**
   * Indexa o metadado no Elasticsearch após criação ou atualização.
   */
  async handleSaved({ metadata }: FhirMetadataSaved): Promise<void> {
    try {
      await this.es.index({
        id:            metadata.id,
        resourceId:    metadata.resourceId,
        resourceType:  metadata.resourceType,
        status:        metadata.status,
        versionId:     metadata.versionId,
        patientId:     metadata.patientId,
        institutionId: metadata.institutionId,
        indexedAt:     metadata.indexedAt?.toISO() ?? null,
        updatedAt:     metadata.updatedAt?.toISO() ?? null,
      })

      logger.debug(`[ES] Documento indexado: ${metadata.id} (${metadata.resourceType}/${metadata.resourceId})`)
    } catch (error) {
      logger.error({ err: error }, `[ES] Falha ao indexar documento ${metadata.id}`)
    }
  }

  /**
   * Remove o documento do Elasticsearch após a exclusão do registro.
   */
  async handleDeleted({ metadataId }: FhirMetadataDeleted): Promise<void> {
    try {
      await this.es.remove(metadataId)
      logger.debug(`[ES] Documento removido: ${metadataId}`)
    } catch (error) {
      logger.error({ err: error }, `[ES] Falha ao remover documento ${metadataId}`)
    }
  }
}