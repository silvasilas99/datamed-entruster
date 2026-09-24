import FhirResourceMetadata from '#models/healthcare/fhir_resource_metadata'
import FabricGatewayService from '#services/fabric_gateway_service'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

type BlockchainMetadata = {
  id: string
  resourceId: string
  resourceType: string
  status?: string
  versionId?: string
  patientId?: string
  institutionId?: string
  createdAt?: string
  updatedAt?: string
}

/**
 * Serviço de sincronização de metadados FHIR da blockchain com o banco local.
 *
 * Responsabilidades:
 *  - Buscar todos os metadados da blockchain via FabricGatewayService
 *  - Persistir (upsert) no banco local para consultas otimizadas
 *  - Marcar registros como indexados após sincronização
 */
export default class FhirSyncService {
  private fabricService: FabricGatewayService

  constructor() {
    this.fabricService = FabricGatewayService.getInstance()
  }

  /**
   * Sincroniza todos os metadados da blockchain com o banco de dados local.
   * Executa upsert para manter idempotência: se o registro já existe, atualiza;
   * caso contrário, insere.
   *
   * @returns Quantidade de registros sincronizados
   */
  async syncAll(): Promise<number> {
    await this.fabricService.initialize()

    const raw = await this.fabricService.getAllFhirMetadata()
    const records: BlockchainMetadata[] = JSON.parse(raw)

    if (!records || records.length === 0) return 0

    let synced = 0

    await db.transaction(async (trx) => {
      for (const record of records) {
        await FhirResourceMetadata.updateOrCreate(
          { resourceId: record.resourceId, resourceType: record.resourceType },
          {
            id: record.id,
            resourceId: record.resourceId,
            resourceType: record.resourceType,
            status: record.status ?? null,
            versionId: record.versionId ?? null,
            patientId: record.patientId ?? null,
            institutionId: record.institutionId ?? null,
            indexedAt: DateTime.now(),
          },
          { client: trx }
        )
        synced++
      }
    })

    return synced
  }

  /**
   * Sincroniza um único recurso pelo ID da blockchain.
   *
   * @param id - ID do recurso na blockchain
   */
  async syncOne(id: string): Promise<FhirResourceMetadata | null> {
    await this.fabricService.initialize()

    const raw = await this.fabricService.getFhirMetadataById(id)
    const record: BlockchainMetadata = JSON.parse(raw)

    if (!record) return null

    const metadata = await FhirResourceMetadata.updateOrCreate(
      { resourceId: record.resourceId, resourceType: record.resourceType },
      {
        id: record.id,
        resourceId: record.resourceId,
        resourceType: record.resourceType,
        status: record.status ?? null,
        versionId: record.versionId ?? null,
        patientId: record.patientId ?? null,
        institutionId: record.institutionId ?? null,
        indexedAt: DateTime.now(),
      }
    )

    return metadata
  }

  /**
   * Retorna todos os registros locais que ainda não foram indexados
   * ou que foram atualizados na blockchain desde o último índice.
   */
  async getPendingIndexing(): Promise<FhirResourceMetadata[]> {
    return FhirResourceMetadata.query().where((q) => {
      q.whereNull('indexed_at').orWhereRaw('indexed_at < updated_at')
    })
  }
}