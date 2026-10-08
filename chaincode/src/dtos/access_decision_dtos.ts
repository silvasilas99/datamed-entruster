// ---------------------------------------------------------------------------
// DTOs de entrada (Input)
// ---------------------------------------------------------------------------

export interface EvaluateAccessDto {
  patientId: string
  resourceType: string
  /** Pode ser string vazia — o contrato resolve o consent ativo pelo MSP do caller */
  consentId: string
}

export interface CheckAccessDto {
  decisionId: string
  patientId: string
  resourceType: string
  consentId: string
}

// ---------------------------------------------------------------------------
// DTOs de saída (Output)
// ---------------------------------------------------------------------------

export interface AccessDecisionOutputDto {
  decisionId: string
  patientId: string
  requestorId: string
  requestorMspId: string
  resourceType: string
  consentId: string | null
  decision: 'ALLOW' | 'DENY'
  reason: string
  timestamp: string
}

export interface AccessEvaluationOutputDto {
  allowed: boolean
  reason: string
}
