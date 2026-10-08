import FhirResourceMetadata from '#models/fhir_resource_metadata'
import FabricGatewayService from '#services/fabric_gateway_service'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

/**
 * Serviço de sincronização de metadados FHIR da blockchain com o banco local e Elasticsearch.
 *
 * Responsabilidades:
 *  - Buscar metadados da blockchain via FabricGatewayService
 *  - Persistir (upsert) no banco local para consultas otimizadas
 *  - Disparar a indexação no Elasticsearch via eventos de modelo Lucid
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

    const records = await this.fabricService.getAllFhirMetadata()

    if (!records || records.length === 0) return 0

    let synced = 0

    await db.transaction(async (trx) => {
      for (const record of records) {
        await FhirResourceMetadata.updateOrCreate(
          { resourceId: record.resourceId, resourceType: record.resourceType },
          {
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

    const record = await this.fabricService.getFhirMetadataById(id)

    if (!record) return null

    const metadata = await FhirResourceMetadata.updateOrCreate(
      { resourceId: record.resourceId, resourceType: record.resourceType },
      {
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
