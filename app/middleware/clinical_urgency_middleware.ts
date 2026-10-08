import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import CuiCalculatorService from '#services/cui_calculator_service'
import type { UrgencyPriority } from '#config/clinical_urgency'

declare module '@adonisjs/core/http' {
  interface HttpContext {
    cuiScore: number
    urgencyPriority: UrgencyPriority
    auditRequestorId: string
    auditRequestorMspId: string
    auditSourceSystem: string
    auditTargetSystem: string
    auditConsentId: string | null
    encounterClass: string
    fhirResource: string
  }
}

/**
 * Inspeciona cabeçalhos clínicos e anexa CUI + prioridade ao HttpContext
 * sem descriptografar o payload FHIR.
 *
 * Headers:
 *  - X-Encounter-Class: EMER | IMP | AMB | BUS
 *  - X-FHIR-Resource: Patient | DiagnosticReport | AllergyIntolerance | ...
 *  - X-User-Role: EmergencyPhysician | Auditor | AdministrativeStaff | ...
 *  - X-Requestor-Id: Identificador do usuário/médico solicitante
 *  - X-Source-System: Sistema de origem (ex: EHR-A)
 *  - X-Target-System: Sistema de destino (ex: EHR-B)
 *  - X-Consent-Id: ID explícito do consentimento (opcional)
 */
export default class ClinicalUrgencyMiddleware {
  private cuiCalculator = new CuiCalculatorService()

  async handle(ctx: HttpContext, next: NextFn) {
    const encounterClass = ctx.request.header('x-encounter-class') || 'AMB'
    const fhirResource = ctx.request.header('x-fhir-resource') || 'Patient'

    const headerRole = ctx.request.header('x-user-role')
    const authUser = ctx.auth?.user as { id?: string | number; role?: string } | undefined
    const userRole = headerRole || authUser?.role || 'AdministrativeStaff'

    const cui = this.cuiCalculator.calculate(encounterClass, fhirResource, userRole)
    ctx.cuiScore = cui
    ctx.urgencyPriority = this.cuiCalculator.classify(cui)

    // Metadados de Auditoria & Interoperabilidade
    ctx.encounterClass = encounterClass
    ctx.fhirResource = fhirResource
    ctx.auditRequestorId =
      ctx.request.header('x-requestor-id') ||
      (authUser?.id ? String(authUser.id) : 'anonymous-requestor')
    ctx.auditRequestorMspId = ctx.request.header('x-requestor-msp') || process.env.FABRIC_MSP_ID || 'Org1MSP'
    ctx.auditSourceSystem = ctx.request.header('x-source-system') || 'Entruster-Gateway'
    ctx.auditTargetSystem = ctx.request.header('x-target-system') || 'Hospital-EHR'
    ctx.auditConsentId = ctx.request.header('x-consent-id') || null

    return next()
  }
}
