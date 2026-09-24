import { Context, Contract, Info, Transaction, Returns } from 'fabric-contract-api'

@Info({ title: 'FhirChaincode', description: 'Smart Contract para Metadados FHIR' })
export class FhirChaincode extends Contract {
  @Transaction()
  public async CreateMetadata(ctx: Context, metadataJson: string): Promise<void> {
    const metadata = JSON.parse(metadataJson)
    const key = metadata.resourceId

    if (!key) {
      throw new Error('O metadado precisa conter um resourceId')
    }

    await ctx.stub.putState(key, Buffer.from(metadataJson))
  }

  @Transaction(false)
  @Returns('string')
  public async ReadMetadata(ctx: Context, id: string): Promise<string> {
    const metadataBytes = await ctx.stub.getState(id)

    if (!metadataBytes || metadataBytes.length === 0) {
      throw new Error(`O metadado com ID ${id} não foi encontrado`)
    }

    // Converte Uint8Array em Buffer antes de transformar em string UTF-8
    return Buffer.from(metadataBytes).toString('utf8')
  }

  @Transaction(false)
  @Returns('string')
  public async GetAllMetadata(ctx: Context): Promise<string> {
    const iterator = await ctx.stub.getStateByRange('', '')
    const results = []

    let result = await iterator.next()
    while (!result.done) {
      if (result.value && result.value.value) {
        // Converte Uint8Array em Buffer antes de transformar em string UTF-8
        const jsonString = Buffer.from(result.value.value).toString('utf8')
        results.push(JSON.parse(jsonString))
      }
      result = await iterator.next()
    }
    await iterator.close()

    return JSON.stringify(results)
  }
}
