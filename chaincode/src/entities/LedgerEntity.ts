import { Context } from 'fabric-contract-api'

/**
 * Classe base abstrata para todas as entidades persistidas no ledger Hyperledger Fabric.
 *
 * Padroniza:
 *  - Serialização/desserialização (toBuffer)
 *  - Geração de chave composta (compositeKey)
 *  - Campos comuns a todos os registros clínicos (patientId, timestamp)
 *
 * Todas as entidades concretas (ConsentRecord, ClinicalInteropEvent, AccessDecisionLog)
 * devem estender esta classe e implementar `docType` e `entityId`.
 */
export abstract class LedgerEntity {
  /** Discriminador de tipo para queries CouchDB (ex.: 'consentRecord') */
  abstract readonly docType: string

  /**
   * ID primário da entidade — mapeado para o campo específico de cada tipo
   * (consentId, eventId, decisionId…).
   */
  abstract get entityId(): string

  /** ID do paciente — campo comum a todos os registros clínicos */
  patientId!: string

  /** Timestamp ISO da transação Fabric */
  timestamp!: string

  /**
   * Serializa a entidade para Buffer (UTF-8 JSON) para gravação no ledger.
   */
  toBuffer(): Uint8Array {
    return Buffer.from(JSON.stringify(this))
  }

  /**
   * Gera a chave composta no StateDB usando o CreateCompositeKey do stub.
   * @param ctx    - Contexto da transação Fabric
   * @param docType - Tipo do documento (ex.: 'consentRecord')
   * @param id     - ID primário da entidade
   */
  static compositeKey(ctx: Context, docType: string, id: string): string {
    return ctx.stub.createCompositeKey(docType, [id])
  }
}
