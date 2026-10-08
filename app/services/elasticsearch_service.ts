import { Client } from '@elastic/elasticsearch'
import logger from '@adonisjs/core/services/logger'
import elasticsearchConfig from '#config/elasticsearch'

export type FhirMetadataDocument = {
  id: string
  resourceId: string
  resourceType: string
  status: string | null
  versionId: string | null
  patientId: string | null
  institutionId: string | null
  numericValue?: number | null
  indexedAt: string | null
  updatedAt: string | null
  createdAt?: string | null
}

export type InstitutionDocument = {
  id: string
  name: string
  createdAt: string | null
  updatedAt: string | null
}

export type SearchResult<T> = {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export type MetadataSearchParams = {
  q?: string
  resourceId?: string
  resourceType?: string
  status?: string
  versionId?: string
  patientId?: string
  institutionId?: string
  startDate?: string
  endDate?: string
  numericValue?: number
  numericValueGte?: number
  numericValueLte?: number
  from?: string
  to?: string
  page?: number
  limit?: number
  sortBy?: 'indexedAt' | 'updatedAt' | 'createdAt' | 'resourceType' | 'numericValue' | '_score'
  sortOrder?: 'asc' | 'desc'
}

export type InstitutionSearchParams = {
  q?: string
  name?: string
  page?: number
  limit?: number
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | '_score'
  sortOrder?: 'asc' | 'desc'
}

export const FHIR_METADATA_INDEX = 'fhir_metadata'
export const INSTITUTIONS_INDEX = 'institutions'

/**
 * Serviço singleton que encapsula o client Elasticsearch.
 * Fornece métodos de alto nível para indexação, remoção e buscas
 * otimizadas de Metadados FHIR e Instituições de Saúde.
 */
export default class ElasticsearchService {
  private static instance: ElasticsearchService
  private client: Client
  private initialized = false

  private constructor() {
    this.client = new Client({
      node: elasticsearchConfig.url,
      auth: elasticsearchConfig.apiKey ? { apiKey: elasticsearchConfig.apiKey } : undefined,
    })
  }

  static getInstance(): ElasticsearchService {
    if (!ElasticsearchService.instance) {
      ElasticsearchService.instance = new ElasticsearchService()
    }
    return ElasticsearchService.instance
  }

  /**
   * Retorna a instância subjacente do cliente Elasticsearch.
   */
  getClient(): Client {
    return this.client
  }

  /**
   * Verifica a conectividade com o cluster Elasticsearch.
   */
  async ping(): Promise<boolean> {
    try {
      const response = await this.client.ping()
      return response === true || Boolean(response)
    } catch {
      return false
    }
  }

  /**
   * Garante a existência do índice de metadados FHIR com mapping otimizado.
   */
  async ensureMetadataIndex(): Promise<void> {
    const exists = await this.client.indices.exists({ index: FHIR_METADATA_INDEX })
    if (exists) return

    await this.client.indices.create({
      index: FHIR_METADATA_INDEX,
      mappings: {
        properties: {
          id: { type: 'keyword' },
          resourceId: {
            type: 'keyword',
            fields: {
              text: { type: 'text' },
            },
          },
          resourceType: {
            type: 'keyword',
            fields: {
              text: { type: 'text' },
            },
          },
          status: { type: 'keyword' },
          versionId: { type: 'keyword' },
          patientId: { type: 'keyword' },
          institutionId: { type: 'keyword' },
          numericValue: { type: 'scaled_float', scaling_factor: 100 },
          indexedAt: { type: 'date' },
          updatedAt: { type: 'date' },
          createdAt: { type: 'date' },
        },
      },
    })

    logger.info(`Elasticsearch: índice '${FHIR_METADATA_INDEX}' criado com sucesso.`)
  }

  /**
   * Garante a existência do índice de instituições com mapping otimizado.
   */
  async ensureInstitutionIndex(): Promise<void> {
    const exists = await this.client.indices.exists({ index: INSTITUTIONS_INDEX })
    if (exists) return

    await this.client.indices.create({
      index: INSTITUTIONS_INDEX,
      mappings: {
        properties: {
          id: { type: 'keyword' },
          name: {
            type: 'text',
            fields: {
              keyword: { type: 'keyword', ignore_above: 256 },
            },
          },
          createdAt: { type: 'date' },
          updatedAt: { type: 'date' },
        },
      },
    })

    logger.info(`Elasticsearch: índice '${INSTITUTIONS_INDEX}' criado com sucesso.`)
  }

  /**
   * Garante a criação de todos os índices necessários.
   */
  async ensureIndices(): Promise<void> {
    if (this.initialized) return

    await Promise.all([this.ensureMetadataIndex(), this.ensureInstitutionIndex()])
    this.initialized = true
  }

  /**
   * Compatibilidade regressiva para ensureIndex.
   */
  async ensureIndex(): Promise<void> {
    await this.ensureIndices()
  }

  /*
  |--------------------------------------------------------------------------
  | Métodos para Metadados FHIR
  |--------------------------------------------------------------------------
  */

  /**
   * Indexa ou atualiza um documento de metadado FHIR.
   */
  async indexMetadata(doc: FhirMetadataDocument): Promise<void> {
    await this.ensureIndices()
    await this.client.index({
      index: FHIR_METADATA_INDEX,
      id: doc.id,
      document: doc,
    })
  }

  /**
   * Alias de indexMetadata para compatibilidade.
   */
  async index(doc: FhirMetadataDocument): Promise<void> {
    await this.indexMetadata(doc)
  }

  /**
   * Remove um metadado FHIR do índice pelo ID.
   */
  async removeMetadata(id: string): Promise<void> {
    await this.ensureIndices()
    await this.client.delete({ index: FHIR_METADATA_INDEX, id }).catch((err: any) => {
      if (err?.meta?.statusCode !== 404) throw err
    })
  }

  /**
   * Alias de removeMetadata para compatibilidade.
   */
  async remove(id: string): Promise<void> {
    await this.removeMetadata(id)
  }

  /**
   * Busca otimizada de metadados FHIR com busca textual, filtros exatos,
   * intervalos de datas, paginação e ordenação.
   */
  async searchMetadata(
    params: MetadataSearchParams = {}
  ): Promise<SearchResult<FhirMetadataDocument>> {
    await this.ensureIndices()

    const {
      q,
      resourceId,
      resourceType,
      status,
      versionId,
      patientId,
      institutionId,
      startDate,
      endDate,
      numericValue,
      numericValueGte,
      numericValueLte,
      from: filterFrom,
      to: filterTo,
      page = 1,
      limit = 20,
      sortBy = q ? '_score' : 'updatedAt',
      sortOrder = 'desc',
    } = params

    const must: any[] = []
    const filter: any[] = []

    // Busca textual abrangente (se fornecido 'q')
    const term = typeof q === 'string' ? q.trim() : q ? String(q).trim() : ''
    if (term) {
      must.push({
        bool: {
          should: [
            {
              multi_match: {
                query: term,
                fields: [
                  'resourceId^3',
                  'resourceId.text^2',
                  'resourceType^2',
                  'status',
                  'versionId',
                  'patientId',
                  'institutionId',
                ],
                type: 'best_fields',
                fuzziness: 'AUTO',
              },
            },
            {
              wildcard: {
                resourceId: {
                  value: `*${term.toLowerCase()}*`,
                  boost: 2.0,
                  case_insensitive: true,
                },
              },
            },
            {
              wildcard: {
                resourceType: {
                  value: `*${term.toLowerCase()}*`,
                  boost: 1.5,
                  case_insensitive: true,
                },
              },
            },
          ],
          minimum_should_match: 1,
        },
      })
    }

    // Filtros exatos estruturados
    if (resourceId) filter.push({ term: { resourceId } })
    if (resourceType) filter.push({ term: { resourceType } })
    if (status) filter.push({ term: { status } })
    if (versionId) filter.push({ term: { versionId } })
    if (patientId) filter.push({ term: { patientId } })
    if (institutionId) filter.push({ term: { institutionId } })

    // Filtro por valor numérico (exato ou faixa)
    if (numericValue !== undefined) {
      filter.push({ term: { numericValue } })
    } else if (numericValueGte !== undefined || numericValueLte !== undefined) {
      const numRange: Record<string, number> = {}
      if (numericValueGte !== undefined) numRange.gte = numericValueGte
      if (numericValueLte !== undefined) numRange.lte = numericValueLte
      filter.push({ range: { numericValue: numRange } })
    }

    // Filtro por faixa temporal
    const dateLower = startDate ?? filterFrom
    const dateUpper = endDate ?? filterTo
    if (dateLower || dateUpper) {
      const range: Record<string, string> = {}
      if (dateLower) range.gte = dateLower
      if (dateUpper) range.lte = dateUpper
      filter.push({ range: { updatedAt: range } })
    }

    const query =
      must.length > 0 || filter.length > 0
        ? {
            bool: {
              ...(must.length > 0 ? { must } : {}),
              ...(filter.length > 0 ? { filter } : {}),
            },
          }
        : { match_all: {} }

    const sort: any[] = []
    if (sortBy === '_score') {
      sort.push({ _score: { order: sortOrder } })
    } else {
      sort.push({ [sortBy]: { order: sortOrder, unmapped_type: 'date' } })
    }

    const offset = Math.max(0, (page - 1) * limit)

    const result = await this.client.search<FhirMetadataDocument>({
      index: FHIR_METADATA_INDEX,
      from: offset,
      size: limit,
      query,
      sort,
    })

    const rawTotal = result.hits.total
    const total = typeof rawTotal === 'number' ? rawTotal : (rawTotal?.value ?? 0)
    const totalPages = Math.ceil(total / limit)
    const data = result.hits.hits.map((hit) => hit._source!)

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    }
  }

  /**
   * Método de busca compatível com a interface anterior.
   */
  async search(
    filters: Partial<FhirMetadataDocument> = {},
    from = 0,
    size = 20
  ): Promise<FhirMetadataDocument[]> {
    const page = Math.floor(from / size) + 1
    const result = await this.searchMetadata({
      ...(filters as any),
      page,
      limit: size,
    })
    return result.data
  }

  /*
  |--------------------------------------------------------------------------
  | Métodos para Instituições
  |--------------------------------------------------------------------------
  */

  /**
   * Indexa ou atualiza uma instituição no Elasticsearch.
   */
  async indexInstitution(doc: InstitutionDocument): Promise<void> {
    await this.ensureIndices()
    await this.client.index({
      index: INSTITUTIONS_INDEX,
      id: doc.id,
      document: doc,
    })
  }

  /**
   * Remove uma instituição do Elasticsearch pelo ID.
   */
  async removeInstitution(id: string): Promise<void> {
    await this.ensureIndices()
    await this.client.delete({ index: INSTITUTIONS_INDEX, id }).catch((err: any) => {
      if (err?.meta?.statusCode !== 404) throw err
    })
  }

  /**
   * Busca otimizada de instituições no Elasticsearch com busca textual,
   * autocomplete por prefixo, tolerância a erros e paginação.
   */
  async searchInstitutions(
    params: InstitutionSearchParams = {}
  ): Promise<SearchResult<InstitutionDocument>> {
    await this.ensureIndices()

    const {
      q,
      name,
      page = 1,
      limit = 20,
      sortBy = q || name ? '_score' : 'name',
      sortOrder = 'asc',
    } = params

    const qStr = typeof q === 'string' ? q.trim() : q ? String(q).trim() : ''
    const nameStr = typeof name === 'string' ? name.trim() : name ? String(name).trim() : ''
    const searchTerm = qStr || nameStr
    const must: any[] = []

    if (searchTerm) {
      must.push({
        bool: {
          should: [
            {
              term: {
                id: {
                  value: searchTerm,
                  boost: 5.0,
                },
              },
            },
            {
              match_phrase_prefix: {
                name: {
                  query: searchTerm,
                  boost: 3.0,
                },
              },
            },
            {
              match: {
                name: {
                  query: searchTerm,
                  fuzziness: 'AUTO',
                  boost: 2.0,
                },
              },
            },
            {
              wildcard: {
                'name.keyword': {
                  value: `*${searchTerm}*`,
                  case_insensitive: true,
                  boost: 1.5,
                },
              },
            },
          ],
          minimum_should_match: 1,
        },
      })
    }

    const query = must.length > 0 ? { bool: { must } } : { match_all: {} }

    const sort: any[] = []
    if (sortBy === '_score') {
      sort.push({ _score: { order: sortOrder } })
    } else if (sortBy === 'name') {
      sort.push({ 'name.keyword': { order: sortOrder, unmapped_type: 'keyword' } })
    } else {
      sort.push({ [sortBy]: { order: sortOrder, unmapped_type: 'date' } })
    }

    const offset = Math.max(0, (page - 1) * limit)

    const result = await this.client.search<InstitutionDocument>({
      index: INSTITUTIONS_INDEX,
      from: offset,
      size: limit,
      query,
      sort,
    })

    const rawTotal = result.hits.total
    const total = typeof rawTotal === 'number' ? rawTotal : (rawTotal?.value ?? 0)
    const totalPages = Math.ceil(total / limit)
    const data = result.hits.hits.map((hit) => hit._source!)

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    }
  }
}
