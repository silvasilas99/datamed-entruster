export default class MetadataDTO {
  constructor(
    public resourceType: string,
    public resourceId: string,
    public versionId: string,
    public lastUpdated: string,
    public hash: string // Hash do recurso FHIR completo para garantir integridade on-chain
  ) {}

  static fromRequest(data: any): MetadataDTO {
    return new MetadataDTO(
      data.resourceType,
      data.resourceId,
      data.versionId,
      data.lastUpdated,
      data.hash
    )
  }
}
