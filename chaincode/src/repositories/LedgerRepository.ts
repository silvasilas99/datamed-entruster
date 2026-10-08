import { Context } from 'fabric-contract-api'
import { LedgerEntity } from '../entities/LedgerEntity'
import { drainIterator, buildSelectorQuery } from '../utils/queryHelpers'

/**
 * Repositório genérico para entidades do ledger Hyperledger Fabric.
 *
 * Encapsula toda interação com o stub (putState / getState / getQueryResult),
 * eliminando código duplicado dos contratos.
 *
 * @template TEntity  - Entidade concreta (extends LedgerEntity)
 * @template TOutputDto - DTO de saída tipado para a entidade
 */
export abstract class LedgerRepository<TEntity extends LedgerEntity, TOutputDto> {
  constructor(protected readonly ctx: Context) {}

  // ------------------------------------------------------------------
  // Métodos abstratos — implementados pelos repositórios concretos
  // ------------------------------------------------------------------

  /** docType usado para chave composta e filtro em queries CouchDB */
  abstract getDocType(): string

  /** Desserializa um objeto raw (JSON do ledger) na entidade concreta */
  abstract fromRaw(raw: Record<string, any>): TEntity

  /** Projeta a entidade no DTO de saída público (sem docType interno) */
  abstract toOutputDto(entity: TEntity): TOutputDto

  // ------------------------------------------------------------------
  // Operações genéricas — reutilizadas por todos os repositórios
  // ------------------------------------------------------------------

  /**
   * Persiste a entidade no ledger usando chave composta (docType + entityId).
   */
  async save(entity: TEntity): Promise<void> {
    const key = LedgerEntity.compositeKey(this.ctx, this.getDocType(), entity.entityId)
    await this.ctx.stub.putState(key, entity.toBuffer())
  }

  /**
   * Busca uma entidade pelo seu ID primário.
   * @returns A entidade ou null se não existir
   */
  async findById(id: string): Promise<TEntity | null> {
    const key = LedgerEntity.compositeKey(this.ctx, this.getDocType(), id)
    const buffer = await this.ctx.stub.getState(key)
    if (!buffer || buffer.length === 0) return null
    const raw = JSON.parse(Buffer.from(buffer).toString('utf8'))
    return this.fromRaw(raw)
  }

  /**
   * Busca todas as entidades de um paciente (query CouchDB por patientId).
   * @returns Array de OutputDtos tipados
   */
  async findByPatient(patientId: string): Promise<TOutputDto[]> {
    const query = buildSelectorQuery(this.getDocType(), { patientId })
    const iterator = await this.ctx.stub.getQueryResult(JSON.stringify(query))
    const results = await drainIterator(iterator)
    return results.map((r) => this.toOutputDto(this.fromRaw(r)))
  }

  /**
   * Busca todas as entidades do tipo no ledger (query CouchDB sem filtros).
   * @returns Array de OutputDtos tipados
   */
  async findAll(): Promise<TOutputDto[]> {
    const query = buildSelectorQuery(this.getDocType())
    const iterator = await this.ctx.stub.getQueryResult(JSON.stringify(query))
    const results = await drainIterator(iterator)
    return results.map((r) => this.toOutputDto(this.fromRaw(r)))
  }

  /**
   * Verifica se uma entidade com o ID fornecido já existe no ledger.
   */
  async exists(id: string): Promise<boolean> {
    const key = LedgerEntity.compositeKey(this.ctx, this.getDocType(), id)
    const existing = await this.ctx.stub.getState(key)
    return !!(existing && existing.length > 0)
  }

  /**
   * Retorna a chave composta para um ID, sem realizar leitura no ledger.
   * Útil para operações de histórico (getHistoryForKey) executadas no contrato.
   */
  buildKey(id: string): string {
    return LedgerEntity.compositeKey(this.ctx, this.getDocType(), id)
  }

  /**
   * Busca entidades com filtros adicionais arbitrários (query CouchDB).
   * @param filters - Campos extras para o selector (além do docType)
   */
  async findWhere(filters: Record<string, any>): Promise<TOutputDto[]> {
    const query = buildSelectorQuery(this.getDocType(), filters)
    const iterator = await this.ctx.stub.getQueryResult(JSON.stringify(query))
    const results = await drainIterator(iterator)
    return results.map((r) => this.toOutputDto(this.fromRaw(r)))
  }

  /**
   * Busca entidades com filtros arbitrários e retorna entidades cruas (não DTOs).
   * Útil para uso interno entre repositórios.
   */
  async findWhereRaw(filters: Record<string, any>): Promise<TEntity[]> {
    const query = buildSelectorQuery(this.getDocType(), filters)
    const iterator = await this.ctx.stub.getQueryResult(JSON.stringify(query))
    const results = await drainIterator(iterator)
    return results.map((r) => this.fromRaw(r))
  }
}
