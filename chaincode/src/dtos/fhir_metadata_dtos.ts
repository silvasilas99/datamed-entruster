// ---------------------------------------------------------------------------
// DTOs de entrada (Input)
// ---------------------------------------------------------------------------

export interface CreateFhirMetadataDto {
  resourceId: string
  resourceType: string
  versionId: string
  lastUpdated: string
  hash: string
  status?: string
  patientId?: string
  institutionId?: string
}

// ---------------------------------------------------------------------------
// DTO de saída (Output)
// ---------------------------------------------------------------------------

export interface FhirMetadataOutputDto {
  resourceId: string
  resourceType: string
  versionId: string
  lastUpdated: string
  hash: string
  status?: string
  patientId?: string
  institutionId?: string
}
