import type { UrgencyPriority } from '#config/clinical_urgency'

export interface ClinicalAccessPayload {
  eventId: string
  patientId: string
  requestorId: string
  requestorMspId: string
  sourceSystem: string
  targetSystem: string
  resourceType: string
  resourceHash: string
  direction: 'INBOUND' | 'OUTBOUND'
  consentId: string | null
  encounterClass: string
  cuiScore: number
  urgencyPriority: UrgencyPriority
  authorized: boolean
  reason: string
  timestamp: string
}

/**
 * Emitido quando uma consulta ou troca de metadados clínicos é executada.
 * Transporta os dados necessários para o registro imutável do evento
 * no Hyperledger Fabric (HealthInteropContract).
 */
export default class ClinicalAccessEvent {
  constructor(public readonly payload: ClinicalAccessPayload) {}
}
