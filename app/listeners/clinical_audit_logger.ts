import type ClinicalAccessEvent from '#events/clinical_access_event'
import FabricGatewayService from '#services/fabric_gateway_service'
import logger from '@adonisjs/core/services/logger'

/**
 * Escuta eventos de acesso clínico e registra a prova de interoperabilidade
 * de forma assíncrona no Hyperledger Fabric (HealthInteropContract),
 * garantindo trilha de auditoria sem bloquear a latência de leitura em emergências.
 */
export default class ClinicalAuditLogger {
  private fabric = FabricGatewayService.getInstance()

  async handle({ payload }: ClinicalAccessEvent): Promise<void> {
    const isAuditEnabled = process.env.CLINICAL_AUDIT_ENABLED !== 'false'
    if (!isAuditEnabled) {
      logger.debug(
        `[ClinicalAuditLogger] Auditoria em blockchain desabilitada por configuração. Ignorando evento ${payload.eventId}`
      )
      return
    }

    try {
      await this.fabric.initialize()
    } catch (error) {
      logger.warn(
        { err: (error as Error).message },
        `[ClinicalAuditLogger] Gateway Fabric indisponível para registrar evento ${payload.eventId}. Registro em ledger ignorado.`
      )
      return
    }

    try {
      const result = await this.fabric.recordInteropEvent({
        eventId: payload.eventId,
        patientId: payload.patientId,
        sourceSystem: payload.sourceSystem,
        targetSystem: payload.targetSystem,
        resourceType: payload.resourceType,
        resourceHash: payload.resourceHash,
        direction: payload.direction as 'INBOUND' | 'OUTBOUND',
        consentId: payload.consentId || ''
      })

      logger.info(
        `[ClinicalAuditLogger] Evento de interop ${payload.eventId} registrado no Fabric com sucesso. Resultado: ${result}`
      )
    } catch (error) {
      logger.error(
        { err: error },
        `[ClinicalAuditLogger] Falha ao registrar interop event ${payload.eventId} no Fabric (patient: ${payload.patientId})`
      )
    }
  }
}
