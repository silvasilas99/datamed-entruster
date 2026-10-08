import { Context, Contract, Info, Transaction, Returns } from 'fabric-contract-api'
import crypto from 'node:crypto'

import { ConsentRecord, STATUS } from './entities/ConsentRecord'
import { ClinicalInteropEvent } from './entities/ClinicalInteropEvent'
import { AccessDecisionLog } from './entities/AccessDecisionLog'

import { ConsentRepository } from './repositories/ConsentRepository'
import { InteropEventRepository } from './repositories/InteropEventRepository'
import { AccessDecisionRepository } from './repositories/AccessDecisionRepository'

import {
  CreateConsentDto,
  RevokeConsentDto,
  ConsentOutputDto,
} from './dtos/consent_dtos'
import {
  RecordInteropEventDto,
  RecordInteropEventResultDto,
} from './dtos/interop_event_dtos'
import {
  EvaluateAccessDto,
  CheckAccessDto,
  AccessDecisionOutputDto,
  AccessEvaluationOutputDto,
} from './dtos/access_decision_dtos'

import { ROLES, getClientInfo, requireRole, requireSelfOrRole, evaluateConsentAccess } from './utils/accessControl'
import { txTimestampToISO } from './utils/time'

const LEDGER_META_KEY = 'ledgerMeta'

@Info({ title: 'HealthInteropContract', description: 'Smart Contract for Health Interoperability Events' })
export class HealthInteropContract extends Contract {
  constructor() {
    super('HealthInteropContract')
  }

  // ---------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------

  @Transaction()
  public async InitLedger(ctx: Context): Promise<void> {
    const existing = await ctx.stub.getState(LEDGER_META_KEY)
    if (existing && existing.length > 0) {
      throw new Error('Ledger already initialized')
    }
    const meta = {
      docType: 'ledgerMeta',
      contract: 'HealthInteropContract',
      initializedAt: txTimestampToISO(ctx),
      schemaVersion: '1.0.0',
    }
    await ctx.stub.putState(LEDGER_META_KEY, Buffer.from(JSON.stringify(meta)))
  }

  // ---------------------------------------------------------------------
  // Consent management
  // ---------------------------------------------------------------------

  /**
   * Cria um novo registro de consentimento no ledger.
   * @param payloadJson - JSON serializado de CreateConsentDto
   */
  @Transaction()
  public async CreateConsentRecord(ctx: Context, payloadJson: string): Promise<string> {
    requireRole(ctx, [ROLES.DATA_CONTROLLER, ROLES.PATIENT])

    const dto: CreateConsentDto = JSON.parse(payloadJson)
    const client = getClientInfo(ctx)
    const repo = new ConsentRepository(ctx)
    const atIso = txTimestampToISO(ctx)

    if (await repo.exists(dto.consentId)) {
      throw new Error(`Consent record ${dto.consentId} already exists`)
    }

    const record = new ConsentRecord({
      consentId: dto.consentId,
      patientId: dto.patientId,
      dataControllerMspId: client.mspId,
      dataControllerId: dto.dataControllerId,
      scope: JSON.parse(dto.scopeJson),
      purpose: dto.purpose,
      payloadHash: dto.payloadHash,
      grantedAt: dto.grantedAt,
      expiresAt: dto.expiresAt || null,
      status: STATUS.ACTIVE,
      createdBy: client.id,
      updatedAt: atIso,
      timestamp: atIso,
    })
    ConsentRecord.validate(record)

    await repo.save(record)
    ctx.stub.setEvent('ConsentCreated', record.toBuffer())
    return JSON.stringify(repo.toOutputDto(record))
  }

  /**
   * Revoga um registro de consentimento existente.
   * @param payloadJson - JSON serializado de RevokeConsentDto
   */
  @Transaction()
  public async RevokeConsent(ctx: Context, payloadJson: string): Promise<string> {
    const dto: RevokeConsentDto = JSON.parse(payloadJson)
    const repo = new ConsentRepository(ctx)
    const atIso = txTimestampToISO(ctx)

    const record = await repo.findById(dto.consentId)
    if (!record) {
      throw new Error(`Consent record ${dto.consentId} does not exist`)
    }

    requireSelfOrRole(ctx, record.patientId, [ROLES.DATA_CONTROLLER, ROLES.PATIENT])

    if (record.status === STATUS.REVOKED) {
      throw new Error(`Consent record ${dto.consentId} is already revoked`)
    }

    record.status = STATUS.REVOKED
    record.revokedAt = atIso
    record.revokedReason = dto.reason
    record.updatedAt = atIso
    record.timestamp = atIso

    await repo.save(record)
    ctx.stub.setEvent('ConsentRevoked', record.toBuffer())
    return JSON.stringify(repo.toOutputDto(record))
  }

  /**
   * Busca um registro de consentimento pelo ID.
   * @returns JSON serializado de ConsentOutputDto
   */
  @Transaction(false)
  @Returns('string')
  public async GetConsent(ctx: Context, consentId: string): Promise<string> {
    requireRole(ctx, [ROLES.DATA_CONTROLLER, ROLES.CLINICIAN, ROLES.AUDITOR, ROLES.PATIENT])

    const repo = new ConsentRepository(ctx)
    const record = await repo.findById(consentId)
    if (!record) {
      throw new Error(`Consent record ${consentId} does not exist`)
    }
    return JSON.stringify(repo.toOutputDto(record))
  }

  /**
   * Lista todos os consentimentos de um paciente.
   * @returns JSON serializado de ConsentOutputDto[]
   */
  @Transaction(false)
  @Returns('string')
  public async QueryConsentsByPatient(ctx: Context, patientId: string): Promise<string> {
    requireRole(ctx, [ROLES.DATA_CONTROLLER, ROLES.CLINICIAN, ROLES.AUDITOR, ROLES.PATIENT])

    const repo = new ConsentRepository(ctx)
    const results = await repo.findByPatient(patientId)
    return JSON.stringify(results)
  }

  /**
   * Retorna o histórico de um registro de consentimento.
   * @returns JSON serializado do histórico de transações
   */
  @Transaction(false)
  @Returns('string')
  public async GetConsentHistory(ctx: Context, consentId: string): Promise<string> {
    requireRole(ctx, [ROLES.AUDITOR, ROLES.PATIENT])

    const key = new ConsentRepository(ctx).buildKey(consentId)
    const history = await this._getHistory(ctx, key)
    return JSON.stringify(history)
  }

  // ---------------------------------------------------------------------
  // Access evaluation
  // ---------------------------------------------------------------------

  /**
   * Avalia (sem gravar) se o acesso a um recurso é permitido pelo consent.
   * @param payloadJson - JSON serializado de EvaluateAccessDto
   * @returns JSON serializado de AccessEvaluationOutputDto
   */
  @Transaction(false)
  @Returns('string')
  public async EvaluateAccess(ctx: Context, payloadJson: string): Promise<string> {
    requireRole(ctx, [ROLES.DATA_CONTROLLER, ROLES.CLINICIAN, ROLES.AUDITOR])

    const dto: EvaluateAccessDto = JSON.parse(payloadJson)
    const client = getClientInfo(ctx)
    const repo = new ConsentRepository(ctx)

    const consent = await repo.resolveConsent(dto.patientId, client.mspId, dto.resourceType, dto.consentId)
    const atIso = txTimestampToISO(ctx)
    const result: AccessEvaluationOutputDto = evaluateConsentAccess(consent, dto.resourceType, atIso)
    return JSON.stringify(result)
  }

  /**
   * Avalia e registra uma decisão de acesso no ledger (audit trail imutável).
   * @param payloadJson - JSON serializado de CheckAccessDto
   * @returns JSON serializado de AccessDecisionOutputDto
   */
  @Transaction()
  public async CheckAccess(ctx: Context, payloadJson: string): Promise<string> {
    requireRole(ctx, [ROLES.DATA_CONTROLLER, ROLES.CLINICIAN, ROLES.AUDITOR])

    const dto: CheckAccessDto = JSON.parse(payloadJson)
    const client = getClientInfo(ctx)
    const atIso = txTimestampToISO(ctx)

    const consentRepo = new ConsentRepository(ctx)
    const decisionRepo = new AccessDecisionRepository(ctx)

    if (await decisionRepo.exists(dto.decisionId)) {
      throw new Error(`Access decision ${dto.decisionId} already exists`)
    }

    const consent = await consentRepo.resolveConsent(dto.patientId, client.mspId, dto.resourceType, dto.consentId)
    const evaluation = evaluateConsentAccess(consent, dto.resourceType, atIso)

    const log = new AccessDecisionLog({
      decisionId: dto.decisionId,
      patientId: dto.patientId,
      requestorId: client.id,
      requestorMspId: client.mspId,
      resourceType: dto.resourceType,
      consentId: consent ? consent.consentId : null,
      decision: evaluation.allowed ? 'ALLOW' : 'DENY',
      reason: evaluation.reason,
      timestamp: atIso,
    })

    await decisionRepo.save(log)
    ctx.stub.setEvent('AccessDecisionLogged', log.toBuffer())
    return JSON.stringify(decisionRepo.toOutputDto(log))
  }

  /**
   * Lista decisões de acesso de um paciente (apenas auditores).
   * @returns JSON serializado de AccessDecisionOutputDto[]
   */
  @Transaction(false)
  @Returns('string')
  public async QueryAccessDecisions(ctx: Context, patientId: string): Promise<string> {
    requireRole(ctx, [ROLES.AUDITOR])

    const repo = new AccessDecisionRepository(ctx)
    const results = await repo.findByPatient(patientId)
    return JSON.stringify(results)
  }

  // ---------------------------------------------------------------------
  // Interoperability events
  // ---------------------------------------------------------------------

  /**
   * Registra um evento de interoperabilidade clínica após verificar o consent.
   * @param payloadJson - JSON serializado de RecordInteropEventDto
   * @returns JSON serializado de RecordInteropEventResultDto
   */
  @Transaction()
  public async RecordInteropEvent(ctx: Context, payloadJson: string): Promise<string> {
    requireRole(ctx, [ROLES.DATA_CONTROLLER, ROLES.CLINICIAN])

    const dto: RecordInteropEventDto = JSON.parse(payloadJson)
    const client = getClientInfo(ctx)
    const atIso = txTimestampToISO(ctx)

    const consentRepo = new ConsentRepository(ctx)
    const eventRepo = new InteropEventRepository(ctx)
    const decisionRepo = new AccessDecisionRepository(ctx)

    if (await eventRepo.exists(dto.eventId)) {
      throw new Error(`Interop event ${dto.eventId} already exists`)
    }

    const consent = await consentRepo.resolveConsent(dto.patientId, client.mspId, dto.resourceType, dto.consentId)
    const evaluation = evaluateConsentAccess(consent, dto.resourceType, atIso)

    // Grava o log de decisão independentemente do resultado
    const decisionLog = new AccessDecisionLog({
      decisionId: `${dto.eventId}-decision`,
      patientId: dto.patientId,
      requestorId: client.id,
      requestorMspId: client.mspId,
      resourceType: dto.resourceType,
      consentId: consent ? consent.consentId : null,
      decision: evaluation.allowed ? 'ALLOW' : 'DENY',
      reason: evaluation.reason,
      timestamp: atIso,
    })
    await decisionRepo.save(decisionLog)

    if (!evaluation.allowed) {
      ctx.stub.setEvent('InteropEventDenied', decisionLog.toBuffer())
      const result: RecordInteropEventResultDto = {
        recorded: false,
        eventId: dto.eventId,
        reason: evaluation.reason,
      }
      return JSON.stringify(result)
    }

    const event = new ClinicalInteropEvent({
      eventId: dto.eventId,
      patientId: dto.patientId,
      sourceSystem: dto.sourceSystem,
      targetSystem: dto.targetSystem,
      resourceType: dto.resourceType,
      resourceHash: dto.resourceHash,
      direction: dto.direction,
      consentId: consent!.consentId,
      requestorId: client.id,
      requestorMspId: client.mspId,
      authorized: true,
      timestamp: atIso,
      recordedBy: client.id,
    })
    ClinicalInteropEvent.validate(event)

    await eventRepo.save(event)
    ctx.stub.setEvent('InteropEventRecorded', event.toBuffer())

    const result: RecordInteropEventResultDto = {
      recorded: true,
      eventId: dto.eventId,
      event: eventRepo.toOutputDto(event),
    }
    return JSON.stringify(result)
  }

  /**
   * Busca um evento de interoperabilidade pelo ID.
   */
  @Transaction(false)
  @Returns('string')
  public async GetInteropEvent(ctx: Context, eventId: string): Promise<string> {
    requireRole(ctx, [ROLES.DATA_CONTROLLER, ROLES.CLINICIAN, ROLES.AUDITOR, ROLES.PATIENT])

    const repo = new InteropEventRepository(ctx)
    const event = await repo.findById(eventId)
    if (!event) {
      throw new Error(`Interop event ${eventId} does not exist`)
    }
    return JSON.stringify(repo.toOutputDto(event))
  }

  /**
   * Lista todos os eventos de interoperabilidade de um paciente.
   */
  @Transaction(false)
  @Returns('string')
  public async QueryEventsByPatient(ctx: Context, patientId: string): Promise<string> {
    requireRole(ctx, [ROLES.DATA_CONTROLLER, ROLES.CLINICIAN, ROLES.AUDITOR, ROLES.PATIENT])

    const repo = new InteropEventRepository(ctx)
    const results = await repo.findByPatient(patientId)
    return JSON.stringify(results)
  }

  /**
   * Busca eventos de interoperabilidade de um paciente dentro de um intervalo de datas.
   */
  @Transaction(false)
  @Returns('string')
  public async QueryEventsByDateRange(
    ctx: Context,
    patientId: string,
    startIso: string,
    endIso: string
  ): Promise<string> {
    requireRole(ctx, [ROLES.DATA_CONTROLLER, ROLES.CLINICIAN, ROLES.AUDITOR, ROLES.PATIENT])

    const repo = new InteropEventRepository(ctx)
    const results = await repo.findByDateRange(patientId, startIso, endIso)
    return JSON.stringify(results)
  }

  /**
   * Retorna o histórico de um evento de interoperabilidade.
   */
  @Transaction(false)
  @Returns('string')
  public async GetEventHistory(ctx: Context, eventId: string): Promise<string> {
    requireRole(ctx, [ROLES.AUDITOR])

    const key = new InteropEventRepository(ctx).buildKey(eventId)
    const history = await this._getHistory(ctx, key)
    return JSON.stringify(history)
  }

  // ---------------------------------------------------------------------
  // Utilitários públicos
  // ---------------------------------------------------------------------

  public static sha256Hex(input: string | Buffer): string {
    return crypto.createHash('sha256').update(input).digest('hex')
  }

  // ---------------------------------------------------------------------
  // Helpers privados
  // ---------------------------------------------------------------------

  private async _getHistory(ctx: Context, key: string): Promise<object[]> {
    const iterator = await ctx.stub.getHistoryForKey(key)
    const history: object[] = []
    let result = await iterator.next()
    while (!result.done) {
      history.push({
        txId: result.value.txId,
        timestamp: result.value.timestamp,
        isDelete: result.value.isDelete,
        value:
          result.value.value && result.value.value.length
            ? JSON.parse(Buffer.from(result.value.value).toString('utf8'))
            : null,
      })
      result = await iterator.next()
    }
    await iterator.close()
    return history
  }
}
