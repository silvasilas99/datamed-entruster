// ---------------------------------------------------------------------------
// DTO de entrada — usado pelo FabricGatewayService para chamar o chaincode
// ---------------------------------------------------------------------------

export interface CreateConsentInputDto {
  consentId: string
  patientId: string
  dataControllerId: string
  /** Array de resource types (ex.: ['Observation', 'Patient']) — serializado para JSON antes de enviar ao chaincode */
  scope: string[]
  purpose: string
  payloadHash: string
  grantedAt: string
  expiresAt?: string
}

export interface RevokeConsentInputDto {
  consentId: string
  reason: string
}

// ---------------------------------------------------------------------------
// DTO de saída — retornado pelo FabricGatewayService após deserializar a resposta
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
