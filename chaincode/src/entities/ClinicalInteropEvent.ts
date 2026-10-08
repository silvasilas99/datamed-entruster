import { LedgerEntity } from './LedgerEntity'

export const DOC_TYPE = 'interopEvent'

export const DIRECTION = Object.freeze({
  INBOUND: 'INBOUND',
  OUTBOUND: 'OUTBOUND',
})

export class ClinicalInteropEvent extends LedgerEntity {
  readonly docType = DOC_TYPE

  public eventId: string
  public sourceSystem: string
  public targetSystem: string
  public resourceType: string
  public resourceHash: string
  public direction: string
  public consentId: string | null
  public requestorId: string
  public requestorMspId: string
  public authorized: boolean
  public recordedBy: string | null

  constructor(init: Partial<ClinicalInteropEvent>) {
    super()
    this.eventId = init.eventId!
    this.patientId = init.patientId!
    this.sourceSystem = init.sourceSystem!
    this.targetSystem = init.targetSystem!
    this.resourceType = init.resourceType!
    this.resourceHash = init.resourceHash!
    this.direction = init.direction!
    this.consentId = init.consentId || null
    this.requestorId = init.requestorId!
    this.requestorMspId = init.requestorMspId!
    this.authorized = init.authorized!
    this.timestamp = init.timestamp!
    this.recordedBy = init.recordedBy || null
  }

  /** Implementação do entityId exigida por LedgerEntity */
  get entityId(): string {
    return this.eventId
  }

  static validate(fields: Partial<ClinicalInteropEvent>) {
    const required = [
      'eventId',
      'patientId',
      'sourceSystem',
      'targetSystem',
      'resourceType',
      'resourceHash',
      'direction',
      'requestorId',
      'requestorMspId',
      'timestamp',
    ] as const

    const missing = required.filter(
      (key) => fields[key] === undefined || fields[key] === null || fields[key] === ''
    )

    if (missing.length > 0) {
      throw new Error(
        `ClinicalInteropEvent is missing required field(s): ${missing.join(', ')}`
      )
    }
    if (!Object.values(DIRECTION).includes(fields.direction as any)) {
      throw new Error(
        `ClinicalInteropEvent.direction must be one of ${Object.values(DIRECTION).join(', ')}`
      )
    }
  }

  static fromRaw(raw: Record<string, any>): ClinicalInteropEvent {
    return new ClinicalInteropEvent(raw)
  }
}
