// ---------------------------------------------------------------------------
// DTO de entrada
// ---------------------------------------------------------------------------

export interface RecordInteropEventInputDto {
  eventId: string
  patientId: string
  sourceSystem: string
  targetSystem: string
  resourceType: string
  resourceHash: string
  direction: 'INBOUND' | 'OUTBOUND'
  consentId?: string
}

// ---------------------------------------------------------------------------
// DTOs de saída
// ---------------------------------------------------------------------------

export interface InteropEventOutputDto {
  eventId: string
  patientId: string
  sourceSystem: string
  targetSystem: string
  resourceType: string
  resourceHash: string
  direction: string
  consentId: string | null
  requestorId: string
  requestorMspId: string
  authorized: boolean
  timestamp: string
  recordedBy: string | null
}

export interface RecordInteropEventResultDto {
  recorded: boolean
  eventId: string
  reason?: string
  event?: InteropEventOutputDto
}
