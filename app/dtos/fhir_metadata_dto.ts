// ---------------------------------------------------------------------------
// DTO de entrada
// ---------------------------------------------------------------------------

export interface CreateFhirMetadataInputDto {
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
// DTO de saída
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
