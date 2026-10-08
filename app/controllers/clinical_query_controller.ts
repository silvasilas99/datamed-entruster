import { createHash, randomUUID } from 'node:crypto'
import type { HttpContext } from '@adonisjs/core/http'
import emitter from '@adonisjs/core/services/emitter'
import DynamicRoutingService from '#services/dynamic_routing_service'
import { searchMetadataValidator } from '#validators/metadata_validator'
import ClinicalAccessEvent from '#events/clinical_access_event'

export default class ClinicalQueryController {
  private routingService = new DynamicRoutingService()

  /**
   * @fetchPatientMetadata
   * @summary Consulta Clínica com Urgency Routing
   * @description Roteia a leitura conforme Clinical Urgency Index (Redis / State DB / Elasticsearch) e audita imutavelmente o acesso no Hyperledger Fabric via barramento assíncrono.
   * @paramPath patientHash - Hash único do paciente (UUID/Hash)
   * @paramHeader X-Encounter-Class - Classe do encontro (ex: EMER, IMP, AMB, BUS) - opcional
   * @paramHeader X-FHIR-Resource - Recurso alvo (ex: AllergyIntolerance, Patient) - opcional
   * @paramHeader X-User-Role - Papel clínico do solicitante (ex: EmergencyPhysician, Auditor) - opcional
   * @responseBody 200 - {"auditEventId": "uuid", "cuiScore": 85, "priority": "HIGH", "result": {"source": "REDIS_HOT_NODE", "latencyMs": 5, "data": []}}
   */
  public async fetchPatientMetadata(ctx: HttpContext) {
    const patientHash = ctx.params.patientHash
    const queryParams = await ctx.request.validateUsing(searchMetadataValidator)

    const result = await this.routingService.routeQuery(ctx, patientHash, queryParams)

    // Gera ID único de auditoria e calcula hash SHA-256 dos dados retornados (LGPD/HIPAA: prova sem PHI)
    const auditEventId = randomUUID()
    const resourceHash = createHash('sha256')
      .update(JSON.stringify(result.data))
      .digest('hex')

    const resourceType =
      queryParams.resourceType || ctx.fhirResource || (result.data[0]?.resourceType ?? 'Patient')

    const isEmergency = ctx.encounterClass === 'EMER' || ctx.urgencyPriority === 'HIGH'

    // Dispara evento de auditoria de forma assíncrona (não bloqueia a resposta ao cliente)
    emitter.emit(
      ClinicalAccessEvent,
      new ClinicalAccessEvent({
        eventId: auditEventId,
        patientId: patientHash,
        requestorId: ctx.auditRequestorId,
        requestorMspId: ctx.auditRequestorMspId,
        sourceSystem: ctx.auditSourceSystem,
        targetSystem: ctx.auditTargetSystem,
        resourceType,
        resourceHash,
        direction: 'OUTBOUND',
        consentId: ctx.auditConsentId,
        encounterClass: ctx.encounterClass,
        cuiScore: ctx.cuiScore,
        urgencyPriority: ctx.urgencyPriority,
        authorized: true,
        reason: isEmergency ? 'EMERGENCY_BREAK_GLASS' : 'AUTHORIZED_CLINICAL_QUERY',
        timestamp: new Date().toISOString(),
      })
    )

    return ctx.response.ok({
      auditEventId,
      cuiScore: ctx.cuiScore,
      priority: ctx.urgencyPriority,
      result,
    })
  }
}
