import { LedgerEntity } from './LedgerEntity'

export const DOC_TYPE = 'accessDecision'

export class AccessDecisionLog extends LedgerEntity {
  readonly docType = DOC_TYPE

  public decisionId: string
  public requestorId: string
  public requestorMspId: string
  public resourceType: string
  public consentId: string | null
  public decision: string
  public reason: string

  constructor(init: Partial<AccessDecisionLog>) {
    super()
    this.decisionId = init.decisionId!
    this.patientId = init.patientId!
    this.requestorId = init.requestorId!
    this.requestorMspId = init.requestorMspId!
    this.resourceType = init.resourceType!
    this.consentId = init.consentId || null
    this.decision = init.decision!
    this.reason = init.reason!
    this.timestamp = init.timestamp!
  }

  /** Implementação do entityId exigida por LedgerEntity */
  get entityId(): string {
    return this.decisionId
  }

  static fromRaw(raw: Record<string, any>): AccessDecisionLog {
    return new AccessDecisionLog(raw)
  }
}
