/**
 * Emitido após um FhirResourceMetadata ser removido do banco.
 * Transporta o ID do documento para remoção do índice Elasticsearch.
 */
export default class FhirMetadataDeleted {
  constructor(public readonly metadataId: string) {}
}