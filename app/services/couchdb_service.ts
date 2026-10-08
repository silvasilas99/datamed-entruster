import nano, { type DocumentScope, type MangoQuery, type MangoSelector } from 'nano'
import logger from '@adonisjs/core/services/logger'
import couchdbConfig from '#config/couchdb'
import type {
  FhirMetadataDocument,
  MetadataSearchParams,
  SearchResult,
} from '#services/elasticsearch_service'

type CouchDoc = FhirMetadataDocument & { _id?: string; _rev?: string }

/**
 * Cliente CouchDB que espelha documentos FHIR (análogo ao state DB rich-query do Fabric).
 * Usado para comparar latência de consultas Mango versus Elasticsearch.
 */
export default class CouchdbService {
  private static instance: CouchdbService
  private server: ReturnType<typeof nano>
  private db: DocumentScope<CouchDoc> | null = null
  private ready = false

  private constructor() {
    const auth =
      couchdbConfig.username && couchdbConfig.password
        ? `${encodeURIComponent(couchdbConfig.username)}:${encodeURIComponent(couchdbConfig.password)}@`
        : ''
    const base = couchdbConfig.url.replace(/^https?:\/\//, '')
    const protocol = couchdbConfig.url.startsWith('https') ? 'https' : 'http'
    this.server = nano(`${protocol}://${auth}${base}`)
  }

  static getInstance(): CouchdbService {
    if (!CouchdbService.instance) {
      CouchdbService.instance = new CouchdbService()
    }
    return CouchdbService.instance
  }

  async ensureDatabase(): Promise<void> {
    if (this.ready && this.db) return

    try {
      const dbs = await this.server.db.list()
      if (!dbs.includes(couchdbConfig.metadataDb)) {
        await this.server.db.create(couchdbConfig.metadataDb)
      }
      this.db = this.server.use<CouchDoc>(couchdbConfig.metadataDb)

      // Índices Mango para filtros/sort usados no benchmark vs Elasticsearch
      await this.db.createIndex({
        index: { fields: ['resourceType', 'updatedAt'] },
        name: 'by-resourceType-updatedAt',
        ddoc: 'fhir-indexes',
      }).catch(() => undefined)

      await this.db.createIndex({
        index: { fields: ['patientId', 'updatedAt'] },
        name: 'by-patientId-updatedAt',
        ddoc: 'fhir-indexes',
      }).catch(() => undefined)

      await this.db.createIndex({
        index: { fields: ['updatedAt'] },
        name: 'by-updatedAt',
        ddoc: 'fhir-indexes',
      }).catch(() => undefined)

      this.ready = true
    } catch (error) {
      this.ready = false
      throw error
    }
  }

  async ping(): Promise<boolean> {
    try {
      await this.server.db.list()
      return true
    } catch {
      return false
    }
  }

  async indexMetadata(doc: FhirMetadataDocument): Promise<void> {
    await this.ensureDatabase()
    if (!this.db) return

    const docId = String(doc.id)
    try {
      const existing = await this.db.get(docId).catch(() => null)
      await this.db.insert({
        ...(existing ?? {}),
        _id: docId,
        _rev: existing?._rev,
        ...doc,
        id: docId,
      })
    } catch (error) {
      logger.error({ err: error }, `[CouchDB] Falha ao indexar ${docId}`)
      throw error
    }
  }

  async removeMetadata(id: string): Promise<void> {
    await this.ensureDatabase()
    if (!this.db) return

    const docId = String(id)
    try {
      const existing = await this.db.get(docId)
      await this.db.destroy(docId, existing._rev!)
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode
      if (status === 404) return
      throw error
    }
  }

  /**
   * Consulta Mango (selector) equivalente aos filtros do Elasticsearch.
   */
  async searchMetadata(
    params: MetadataSearchParams = {}
  ): Promise<SearchResult<FhirMetadataDocument>> {
    await this.ensureDatabase()
    if (!this.db) {
      return { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } }
    }

    const page = params.page || 1
    const limit = Math.min(params.limit || 20, 100)
    const skip = (page - 1) * limit

    const selector: MangoSelector = {}
    if (params.resourceId) selector.resourceId = params.resourceId
    if (params.resourceType) selector.resourceType = params.resourceType
    if (params.status) selector.status = params.status
    if (params.versionId) selector.versionId = params.versionId
    if (params.patientId) selector.patientId = params.patientId
    if (params.institutionId) selector.institutionId = params.institutionId

    const startDate = params.startDate || params.from
    const endDate = params.endDate || params.to
    if (startDate || endDate) {
      selector.updatedAt = {
        ...(startDate ? { $gte: startDate } : {}),
        ...(endDate ? { $lte: endDate } : {}),
      }
    }

    if (params.q) {
      const pattern = `(?i)${params.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`
      selector.$or = [
        { resourceId: { $regex: pattern } },
        { resourceType: { $regex: pattern } },
        { status: { $regex: pattern } },
      ]
    }

    if (Object.keys(selector).length === 0) {
      selector.resourceType = { $exists: true }
    }

    const sortField = params.sortBy && params.sortBy !== '_score' ? params.sortBy : 'updatedAt'
    const sortOrder = params.sortOrder === 'asc' ? 'asc' : 'desc'

    const query: MangoQuery = {
      selector,
      limit,
      skip,
      sort: [{ [sortField]: sortOrder }],
    }

    try {
      const result = await this.db.find(query)
      const docs = result.docs.map(({ _id, _rev, ...rest }) => rest as FhirMetadataDocument)
      const total = skip + docs.length + (docs.length === limit ? limit : 0)

      return {
        data: docs,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      }
    } catch (error) {
      logger.warn({ err: error }, '[CouchDB] find com sort falhou; retry sem sort')
      const fallback = await this.db.find({ selector, limit, skip })
      const docs = fallback.docs.map(({ _id, _rev, ...rest }) => rest as FhirMetadataDocument)
      return {
        data: docs,
        meta: {
          total: skip + docs.length,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil((skip + docs.length) / limit)),
        },
      }
    }
  }
}
