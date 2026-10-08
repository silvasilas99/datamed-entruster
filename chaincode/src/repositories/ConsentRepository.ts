import { Context } from 'fabric-contract-api'
import { LedgerRepository } from './LedgerRepository'
import { ConsentRecord, DOC_TYPE, STATUS } from '../entities/ConsentRecord'
import { ConsentOutputDto } from '../dtos/consent_dtos'
import { buildSelectorQuery } from '../utils/queryHelpers'
import { drainIterator } from '../utils/queryHelpers'

/**
 * Repositório para ConsentRecord.
 * Estende o repositório genérico e adiciona operações específicas de consent.
 */
export class ConsentRepository extends LedgerRepository<ConsentRecord, ConsentOutputDto> {
  constructor(ctx: Context) {
    super(ctx)
  }

  getDocType(): string {
    return DOC_TYPE
  }

  fromRaw(raw: Record<string, any>): ConsentRecord {
    return ConsentRecord.fromRaw(raw)
  }

  toOutputDto(entity: ConsentRecord): ConsentOutputDto {
    return {
      consentId: entity.consentId,
      patientId: entity.patientId,
      dataControllerMspId: entity.dataControllerMspId,
      dataControllerId: entity.dataControllerId,
      scope: entity.scope,
      purpose: entity.purpose,
      payloadHash: entity.payloadHash,
      grantedAt: entity.grantedAt,
      expiresAt: entity.expiresAt,
      status: entity.status,
      revokedAt: entity.revokedAt,
      revokedReason: entity.revokedReason,
      createdBy: entity.createdBy,
      updatedAt: entity.updatedAt,
      timestamp: entity.timestamp,
    }
  }

  // ------------------------------------------------------------------
  // Operações específicas de ConsentRecord
  // ------------------------------------------------------------------

  /**
   * Resolve o consent ativo para um dado paciente, MSP do controlador e tipo de recurso.
   * Usado por CheckAccess, EvaluateAccess e RecordInteropEvent para encontrar
   * automaticamente o consent aplicável quando nenhum consentId é fornecido.
   *
   * @returns O ConsentRecord (entidade) ou null se não houver consent ativo
   */
  async findActiveByController(
    patientId: string,
    dataControllerMspId: string,
    resourceType: string
  ): Promise<ConsentRecord | null> {
    const raw = await this.findWhereRaw({ patientId, dataControllerMspId, status: STATUS.ACTIVE })
    const match = raw.find((c) => c.covers(resourceType))
    return match ?? null
  }

  /**
   * Resolve o consent pelo ID fornecido ou, se vazio, busca o consent ativo por MSP.
   * Centraliza a lógica de resolução usada por múltiplos métodos do contrato.
   */
  async resolveConsent(
    patientId: string,
    dataControllerMspId: string,
    resourceType: string,
    consentId: string
  ): Promise<ConsentRecord | null> {
    if (consentId) {
      return this.findById(consentId)
    }
    return this.findActiveByController(patientId, dataControllerMspId, resourceType)
  }

  /**
   * Busca todos os consents de um paciente como entidades (não DTOs),
   * para uso interno (ex.: auditoria).
   */
  async findByPatientRaw(patientId: string): Promise<ConsentRecord[]> {
    return this.findWhereRaw({ patientId })
  }
}
