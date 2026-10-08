// ---------------------------------------------------------------------------
// DTOs de entrada (Input)
// ---------------------------------------------------------------------------

export interface CreateConsentDto {
  consentId: string
  patientId: string
  dataControllerId: string
  /**
   * Escopo serializado como JSON array.
   * Exemplo: '["Observation","Patient","AllergyIntolerance"]'
   */
  scopeJson: string
  purpose: string
  payloadHash: string
  grantedAt: string
  /** ISO datetime ou string vazia quando sem expiração */
  expiresAt: string
}

export interface RevokeConsentDto {
  consentId: string
  reason: string
}

// ---------------------------------------------------------------------------
// DTO de saída (Output) — sem campos internos como docType
// ---------------------------------------------------------------------------

export interface ConsentOutputDto {
  consentId: string
  patientId: string
  dataControllerMspId: string
  dataControllerId: string
  scope: string[]
  purpose: string
  payloadHash: string
  grantedAt: string
  expiresAt: string | null
  status: string
  revokedAt: string | null
  revokedReason: string | null
  createdBy: string | null
  updatedAt: string | null
  timestamp: string
}
