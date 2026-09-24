import { Client } from '@elastic/elasticsearch'
import logger from '@adonisjs/core/services/logger'

export type FhirMetadataDocument = {
  id: string
  resourceId: string
  resourceType: string
  status: string | null
  versionId: string | null
  patientId: string | null
  institutionId: string | null
  indexedAt: string | null
  updatedAt: string | null
}

const INDEX_NAME = 'fhir_metadata'

/**
 * Serviço singleton que encapsula o client Elasticsearch.
 * Expõe métodos de alto nível para indexar, remover e pesquisar
 * metadados FHIR.
 */
export default class ElasticsearchService {
  private static instance: ElasticsearchService
  private client: Client

  private constructor() {
    this.client = new Client({
      node: process.env.ELASTICSEARCH_URL ?? 'http://localhost:9200',
      auth: process.env.ELASTICSEARCH_API_KEY
        ? { apiKey: process.env.ELASTICSEARCH_API_KEY }
        : undefined,
    })
  }

  static getInstance(): ElasticsearchService {
    if (!ElasticsearchService.instance) {
      ElasticsearchService.instance = new ElasticsearchService()
    }
    return ElasticsearchService.instance
  }

  /**
   * Garante que o índice existe com o mapping correto.
   * Idempotente — seguro para chamar múltiplas vezes.
   */
  async ensureIndex(): Promise<void> {
    const exists = await this.client.indices.exists({ index: INDEX_NAME })
    if (exists) return

    await this.client.indices.create({
      index: INDEX_NAME,
      mappings: {
        properties: {
          id:            { type: 'keyword' },
          resourceId:    { type: 'keyword' },
          resourceType:  { type: 'keyword' },
          status:        { type: 'keyword' },
          versionId:     { type: 'keyword' },
          patientId:     { type: 'keyword' },
          institutionId: { type: 'keyword' },
          indexedAt:     { type: 'date' },
          updatedAt:     { type: 'date' },
        },
      },
    })

    logger.info('Elasticsearch: índice fhir_metadata criado.')
  }

  /**
   * Indexa (cria ou atualiza) um documento de metadado FHIR.
   */
  async index(doc: FhirMetadataDocument): Promise<void> {
    await this.client.index({
      index: INDEX_NAME,
      id: doc.id,
      document: doc,
    })
  }

  /**
   * Remove um documento do índice pelo ID.
   */
  async remove(id: string): Promise<void> {
    await this.client.delete({ index: INDEX_NAME, id }).catch((err) => {
      // Ignora "not found" — o documento pode nunca ter sido indexado
      if (err?.meta?.statusCode !== 404) throw err
    })
  }

  /**
   * Pesquisa metadados FHIR com filtros opcionais.
   *
   * @param filters - Objeto com pares chave/valor a filtrar
   * @param from    - Offset para paginação
   * @param size    - Quantidade máxima de resultados
   */
  async search(
    filters: Partial<FhirMetadataDocument> = {},
    from = 0,
    size = 20
  ): Promise<FhirMetadataDocument[]> {
    const must = Object.entries(filters)
      .filter(([, v]) => v != null)
      .map(([k, v]) => ({ term: { [k]: v } }))

    const result = await this.client.search<FhirMetadataDocument>({
      index: INDEX_NAME,
      from,
      size,
      query: must.length > 0 ? { bool: { must } } : { match_all: {} },
    })

    return result.hits.hits.map((hit) => hit._source!)
  }
}
