import type FhirResourceMetadata from '#models/fhir_resource_metadata'

/**
 * Emitido após um FhirResourceMetadata ser criado ou atualizado.
 * Transporta o snapshot do registro para indexação no Elasticsearch.
 */
export default class FhirMetadataSaved {
  constructor(public readonly metadata: FhirResourceMetadata) {}
}
