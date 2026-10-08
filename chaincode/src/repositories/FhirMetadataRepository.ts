import { Context } from 'fabric-contract-api'
import { CreateFhirMetadataDto, FhirMetadataOutputDto } from '../dtos/fhir_metadata_dtos'

/**
 * Repositório para metadados FHIR (FhirChaincode).
 *
 * Diferente dos repositórios de HealthInteropContract, o FhirChaincode usa chave simples
 * (resourceId) em vez de chave composta, pois seus registros são documentos independentes
 * sem docType de discriminação CouchDB.
 */
export class FhirMetadataRepository {
  constructor(private readonly ctx: Context) {}

  /**
   * Persiste um metadado FHIR no ledger usando o resourceId como chave.
   */
  async save(dto: CreateFhirMetadataDto): Promise<void> {
    if (!dto.resourceId) {
      throw new Error('O metadado precisa conter um resourceId')
    }
    await this.ctx.stub.putState(dto.resourceId, Buffer.from(JSON.stringify(dto)))
  }

  /**
   * Busca um metadado FHIR pelo seu resourceId.
   * @returns O DTO de saída ou null se não existir
   */
  async findById(id: string): Promise<FhirMetadataOutputDto | null> {
    const bytes = await this.ctx.stub.getState(id)
    if (!bytes || bytes.length === 0) return null
    return JSON.parse(Buffer.from(bytes).toString('utf8')) as FhirMetadataOutputDto
  }

  /**
   * Lista todos os metadados FHIR do ledger.
   * Usa range query vazia (início e fim em branco) — padrão do FhirChaincode.
   */
  async findAll(): Promise<FhirMetadataOutputDto[]> {
    const iterator = await this.ctx.stub.getStateByRange('', '')
    const results: FhirMetadataOutputDto[] = []

    let result = await iterator.next()
    while (!result.done) {
      if (result.value && result.value.value) {
        try {
          const jsonString = Buffer.from(result.value.value).toString('utf8')
          results.push(JSON.parse(jsonString) as FhirMetadataOutputDto)
        } catch {
          // Ignora entradas com JSON inválido
        }
      }
      result = await iterator.next()
    }
    await iterator.close()
    return results
  }
}
