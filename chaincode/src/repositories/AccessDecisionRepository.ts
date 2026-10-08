import { Context } from 'fabric-contract-api'
import { LedgerRepository } from './LedgerRepository'
import { AccessDecisionLog, DOC_TYPE } from '../entities/AccessDecisionLog'
import { AccessDecisionOutputDto } from '../dtos/access_decision_dtos'

/**
 * Repositório para AccessDecisionLog.
 * Estende o repositório genérico sem operações adicionais —
 * save, findById, findByPatient e exists são suficientes para este tipo.
 */
export class AccessDecisionRepository extends LedgerRepository<
  AccessDecisionLog,
  AccessDecisionOutputDto
> {
  constructor(ctx: Context) {
    super(ctx)
  }

  getDocType(): string {
    return DOC_TYPE
  }

  fromRaw(raw: Record<string, any>): AccessDecisionLog {
    return AccessDecisionLog.fromRaw(raw)
  }

  toOutputDto(entity: AccessDecisionLog): AccessDecisionOutputDto {
    return {
      decisionId: entity.decisionId,
      patientId: entity.patientId,
      requestorId: entity.requestorId,
      requestorMspId: entity.requestorMspId,
      resourceType: entity.resourceType,
      consentId: entity.consentId,
      decision: entity.decision as 'ALLOW' | 'DENY',
      reason: entity.reason,
      timestamp: entity.timestamp,
    }
  }
}
