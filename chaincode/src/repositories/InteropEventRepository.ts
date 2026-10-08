import { Context } from 'fabric-contract-api'
import { LedgerRepository } from './LedgerRepository'
import { ClinicalInteropEvent, DOC_TYPE } from '../entities/ClinicalInteropEvent'
import { InteropEventOutputDto } from '../dtos/interop_event_dtos'
import { buildSelectorQuery } from '../utils/queryHelpers'
import { drainIterator } from '../utils/queryHelpers'

/**
 * Repositório para ClinicalInteropEvent.
 * Estende o repositório genérico e adiciona busca por intervalo de datas.
 */
export class InteropEventRepository extends LedgerRepository<
  ClinicalInteropEvent,
  InteropEventOutputDto
> {
  constructor(ctx: Context) {
    super(ctx)
  }

  getDocType(): string {
    return DOC_TYPE
  }

  fromRaw(raw: Record<string, any>): ClinicalInteropEvent {
    return ClinicalInteropEvent.fromRaw(raw)
  }

  toOutputDto(entity: ClinicalInteropEvent): InteropEventOutputDto {
    return {
      eventId: entity.eventId,
      patientId: entity.patientId,
      sourceSystem: entity.sourceSystem,
      targetSystem: entity.targetSystem,
      resourceType: entity.resourceType,
      resourceHash: entity.resourceHash,
      direction: entity.direction,
      consentId: entity.consentId,
      requestorId: entity.requestorId,
      requestorMspId: entity.requestorMspId,
      authorized: entity.authorized,
      timestamp: entity.timestamp,
      recordedBy: entity.recordedBy,
    }
  }

  // ------------------------------------------------------------------
  // Operações específicas de ClinicalInteropEvent
  // ------------------------------------------------------------------

  /**
   * Busca eventos de interoperabilidade de um paciente dentro de um intervalo de datas.
   * Requer índice CouchDB em (docType, patientId, timestamp).
   *
   * @param patientId - ID do paciente
   * @param startIso  - Data de início ISO 8601 (inclusive)
   * @param endIso    - Data de fim ISO 8601 (inclusive)
   */
  async findByDateRange(
    patientId: string,
    startIso: string,
    endIso: string
  ): Promise<InteropEventOutputDto[]> {
    const query = {
      selector: {
        docType: DOC_TYPE,
        patientId,
        timestamp: { $gte: startIso, $lte: endIso },
      },
      sort: [{ patientId: 'desc' as const }, { timestamp: 'desc' as const }],
    }
    const iterator = await this.ctx.stub.getQueryResult(JSON.stringify(query))
    const results = await drainIterator(iterator)
    return results.map((r) => this.toOutputDto(this.fromRaw(r)))
  }
}
