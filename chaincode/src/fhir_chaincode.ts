import { Context, Contract, Info, Transaction, Returns } from 'fabric-contract-api'
import { FhirMetadataRepository } from './repositories/FhirMetadataRepository'
import { CreateFhirMetadataDto, FhirMetadataOutputDto } from './dtos/fhir_metadata_dtos'

@Info({ title: 'FhirChaincode', description: 'Smart Contract para Metadados FHIR' })
export class FhirChaincode extends Contract {
  /**
   * Persiste metadados FHIR no ledger.
   * @param payloadJson - JSON serializado de CreateFhirMetadataDto
   */
  @Transaction()
  public async CreateMetadata(ctx: Context, payloadJson: string): Promise<void> {
    const dto: CreateFhirMetadataDto = JSON.parse(payloadJson)
    const repo = new FhirMetadataRepository(ctx)
    await repo.save(dto)
  }

  /**
   * Busca um metadado FHIR pelo resourceId.
   * @returns JSON serializado de FhirMetadataOutputDto
   */
  @Transaction(false)
  @Returns('string')
  public async ReadMetadata(ctx: Context, id: string): Promise<string> {
    const repo = new FhirMetadataRepository(ctx)
    const dto = await repo.findById(id)
    if (!dto) {
      throw new Error(`O metadado com ID ${id} não foi encontrado`)
    }
    return JSON.stringify(dto)
  }

  /**
   * Lista todos os metadados FHIR registrados no ledger.
   * @returns JSON serializado de FhirMetadataOutputDto[]
   */
  @Transaction(false)
  @Returns('string')
  public async GetAllMetadata(ctx: Context): Promise<string> {
    const repo = new FhirMetadataRepository(ctx)
    const results: FhirMetadataOutputDto[] = await repo.findAll()
    return JSON.stringify(results)
  }
}
