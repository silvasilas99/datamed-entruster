// ---------------------------------------------------------------------------
// DTOs de entrada
// ---------------------------------------------------------------------------

export interface EvaluateAccessInputDto {
  patientId: string
  resourceType: string
  consentId?: string
}

export interface CheckAccessInputDto {
  decisionId: string
  patientId: string
  resourceType: string
  consentId?: string
}

// ---------------------------------------------------------------------------
// DTOs de saída
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
