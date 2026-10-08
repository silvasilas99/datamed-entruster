import { LedgerEntity } from './LedgerEntity'

export const DOC_TYPE = 'consentRecord'

export const STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  REVOKED: 'REVOKED',
  EXPIRED: 'EXPIRED',
})

export class ConsentRecord extends LedgerEntity {
  readonly docType = DOC_TYPE

  public consentId: string
  public dataControllerMspId: string
  public dataControllerId: string
  public scope: string[]
  public purpose: string
  public payloadHash: string
  public grantedAt: string
  public expiresAt: string | null
  public status: string
  public revokedAt: string | null
  public revokedReason: string | null
  public createdBy: string | null
  public updatedAt: string | null

  constructor(init: Partial<ConsentRecord>) {
    super()
    this.consentId = init.consentId!
    this.patientId = init.patientId!
    this.dataControllerMspId = init.dataControllerMspId!
    this.dataControllerId = init.dataControllerId!
    this.scope = init.scope || []
    this.purpose = init.purpose!
    this.payloadHash = init.payloadHash!
    this.grantedAt = init.grantedAt!
    this.expiresAt = init.expiresAt || null
    this.status = init.status || STATUS.ACTIVE
    this.revokedAt = init.revokedAt || null
    this.revokedReason = init.revokedReason || null
    this.createdBy = init.createdBy || null
    this.updatedAt = init.updatedAt || null
    this.timestamp = init.timestamp || init.updatedAt || init.grantedAt || new Date().toISOString()
  }

  /** Implementação do entityId exigida por LedgerEntity */
  get entityId(): string {
    return this.consentId
  }

  static validate(fields: Partial<ConsentRecord>) {
    const required = [
      'consentId',
      'patientId',
      'dataControllerMspId',
      'dataControllerId',
      'scope',
      'purpose',
      'payloadHash',
      'grantedAt',
    ] as const

    const missing = required.filter(
      (key) => fields[key] === undefined || fields[key] === null || fields[key] === ''
    )

    if (missing.length > 0) {
      throw new Error(`ConsentRecord is missing required field(s): ${missing.join(', ')}`)
    }
    if (!Array.isArray(fields.scope) || fields.scope.length === 0) {
      throw new Error('ConsentRecord.scope must be a non-empty array of resource types')
    }
    if (fields.expiresAt && new Date(fields.expiresAt) <= new Date(fields.grantedAt!)) {
      throw new Error('ConsentRecord.expiresAt must be after grantedAt')
    }
  }

  isActiveAt(isoTimestamp: string): boolean {
    if (this.status !== STATUS.ACTIVE) {
      return false
    }
    if (this.expiresAt && new Date(isoTimestamp) > new Date(this.expiresAt)) {
      return false
    }
    return true
  }

  covers(resourceType: string): boolean {
    return this.scope.includes(resourceType)
  }

  static fromRaw(raw: Record<string, any>): ConsentRecord {
    return new ConsentRecord(raw)
  }
}
