// ---------------------------------------------------------------------------
// DTOs de entrada (Input)
// ---------------------------------------------------------------------------

export interface RecordInteropEventDto {
  eventId: string
  patientId: string
  sourceSystem: string
  targetSystem: string
  resourceType: string
  resourceHash: string
  /** 'INBOUND' | 'OUTBOUND' */
  direction: string
  /** Pode ser string vazia quando não informado — o contrato resolve o consent ativo */
  consentId: string
}

// ---------------------------------------------------------------------------
// DTO de saída (Output)
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
