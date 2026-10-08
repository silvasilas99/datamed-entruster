import FabricGatewayService from '#services/fabric_gateway_service'
import ElasticsearchService from '#services/elasticsearch_service'
import FhirResourceMetadata from '#models/fhir_resource_metadata'
import { createMetadataValidator, searchMetadataValidator } from '#validators/metadata_validator'
import logger from '@adonisjs/core/services/logger'

import type { HttpContext } from '@adonisjs/core/http'

function extractFabricError(error: unknown): string {
  if (!(error instanceof Error)) return String(error)

  const details = (error as Error & { details?: Array<{ message?: string }> }).details
  if (Array.isArray(details) && details.length > 0) {
    const detailMessages = details.map((d) => d.message).filter(Boolean)
    if (detailMessages.length > 0) return detailMessages.join('; ')
  }

  return error.message
}

export default class MetadataController {
  /**
   * @store
   * @summary Registrar Metadados FHIR
   * @description Persiste metadados na blockchain (Hyperledger Fabric) e sincroniza no banco relacional + Elasticsearch via eventos de domínio.
   * @responseBody 201 - {"message": "Metadado FHIR registrado...", "data": {}, "metadataId": 1}
   * @responseBody 409 - {"error": "already exists", "hint": "..."}
   */
  public async store({ request, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(createMetadataValidator)

      // 1. Persistência na blockchain (Fabric) se não estiver em modo mock/ignorado
      if (process.env.SKIP_FABRIC !== 'true') {
        const fabricService = FabricGatewayService.getInstance()
        await fabricService.initialize()
        await fabricService.createFhirMetadata(payload)
      }

      // 2. Persistência local no banco de dados (dispara @afterSave -> evento -> Elasticsearch)
      const metadataRecord = await FhirResourceMetadata.updateOrCreate(
        {
          resourceId: payload.resourceId,
          resourceType: payload.resourceType,
        },
        {
          versionId: payload.versionId,
          status: payload.status ?? null,
          patientId: payload.patientId ?? null,
          institutionId: payload.institutionId ?? null,
        }
      )

      return response.status(201).json({
        message: 'Metadado FHIR registrado com sucesso na blockchain e indexado',
        data: payload,
        metadataId: metadataRecord.id,
      })
    } catch (error) {
      const message = extractFabricError(error)

      if (/already exists/i.test(message)) {
        return response.status(409).json({
          error: message,
          hint: 'Use um resourceId/versionId diferente, ou um novo hash para uma nova versão.',
        })
      }

      logger.error({ err: error }, 'Erro ao registrar metadado FHIR')
      return response.status(500).json({ error: message })
    }
  }

  /**
   * Rota dedicada para busca otimizada de metadados indexados no Elasticsearch.
   * Suporta busca textual (q), filtros estruturados (resourceType, status, paciente, etc.),
   * períodos de data, ordenação e paginação.
   *
   * GET /api/v1/metadata/search
   */
  /**
   * @elasticList
   * @summary Lista metadados usando Elasticsearch
   * @description Rota dedicada que lista metadados diretamente do Elasticsearch sem fallback. Aceita filtros da busca otimizada.
   * @responseBody 200 - {"data": [], "meta": {}}
   * @responseBody 500 - {"error": "..."}
   */
  public async elasticList({ request, response }: HttpContext) {
    const payload = await request.validateUsing(searchMetadataValidator)
    const elasticService = ElasticsearchService.getInstance()
    try {
      const results = await elasticService.searchMetadata(payload)
      return response.ok(results)
    } catch (error) {
      logger.error({ err: error }, '[Elasticsearch] Falha ao listar metadados')
      return response.status(500).json({ error: (error as Error).message })
    }
  }

  /**
   * @search
   * @summary Busca otimizada de metadados
   * @description Suporta busca textual, filtros estruturados, ordenação e paginação (com fallback ao banco relacional).
   * @responseBody 200 - {"data": [], "meta": {}}
   */
  public async search({ request, response }: HttpContext) {
    const payload = await request.validateUsing(searchMetadataValidator)
    const elasticService = ElasticsearchService.getInstance()

    try {
      const results = await elasticService.searchMetadata(payload)
      return response.ok(results)
    } catch (error) {
      logger.warn(
        { err: error },
        '[Elasticsearch] Falha na busca de metadados. Ativando fallback para o banco relacional.'
      )

      // Fallback resiliente no banco de dados
      const query = FhirResourceMetadata.query()

      if (payload.resourceId) query.where('resourceId', payload.resourceId)
      if (payload.resourceType) query.where('resourceType', payload.resourceType)
      if (payload.status) query.where('status', payload.status)
      if (payload.versionId) query.where('versionId', payload.versionId)
      if (payload.patientId) query.where('patientId', payload.patientId)
      if (payload.institutionId) query.where('institutionId', payload.institutionId)
      if (payload.numericValueGte !== undefined)
        query.where('numericValue', '>=', payload.numericValueGte)
      if (payload.numericValueLte !== undefined)
        query.where('numericValue', '<=', payload.numericValueLte)

      if (payload.q) {
        const term = `%${payload.q}%`
        query.where((sub) => {
          sub
            .whereILike('resourceId', term)
            .orWhereILike('resourceType', term)
            .orWhereILike('status', term)
        })
      }

      const page = payload.page || 1
      const limit = payload.limit || 20
      const paginated = await query.paginate(page, limit)

      return response.ok({
        data: paginated.all(),
        meta: {
          total: paginated.total,
          page: paginated.currentPage,
          limit: paginated.perPage,
          totalPages: paginated.lastPage,
          fallback: true,
        },
      })
    }
  }

  /**
   * @index
   * @summary Lista todos os metadados da Blockchain
   * @description Consulta diretamente na Hyperledger Fabric todos os metadados FHIR registrados.
   * @responseBody 200 - {"data": []}
   */
  public async index({ response }: HttpContext) {
    try {
      const fabricService = FabricGatewayService.getInstance()
      await fabricService.initialize()

      const metadata = await fabricService.getAllFhirMetadata()

      return response.json({ data: metadata })
    } catch (error) {
      const message = extractFabricError(error)
      return response.status(500).json({ error: message })
    }
  }

  /**
   * @show
   * @summary Detalhes de um metadado na Blockchain
   * @description Consulta diretamente na Hyperledger Fabric o histórico/estado de um metadado específico pelo seu ID.
   * @paramPath id - ID único do metadado
   * @responseBody 200 - {}
   */
  public async show({ params, response }: HttpContext) {
    try {
      const fabricService = FabricGatewayService.getInstance()
      await fabricService.initialize()

      // params.id virá da nossa rota dinâmica
      const metadata = await fabricService.getFhirMetadataById(params.id)

      return response.ok(metadata)
    } catch (error) {
      return response.status(500).json({ error: (error as Error).message })
    }
  }
}
