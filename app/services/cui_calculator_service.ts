import {
  clinicalUrgencyConfig,
  type UrgencyPriority,
} from '#config/clinical_urgency'

/**
 * Calcula o Clinical Urgency Index (CUI) em escala 0–100 e classifica a prioridade.
 */
export default class CuiCalculatorService {
  public calculate(
    encounterClass?: string,
    fhirResource?: string,
    userRole?: string
  ): number {
    const wCtx =
      clinicalUrgencyConfig.contextWeights[
        encounterClass as keyof typeof clinicalUrgencyConfig.contextWeights
      ] ?? 0.3
    const wRes =
      clinicalUrgencyConfig.resourceWeights[
        fhirResource as keyof typeof clinicalUrgencyConfig.resourceWeights
      ] ?? 0.5
    const wRol =
      clinicalUrgencyConfig.roleWeights[
        userRole as keyof typeof clinicalUrgencyConfig.roleWeights
      ] ?? 0.2

    const { w1_context, w2_resource, w3_role } = clinicalUrgencyConfig.weights
    const cui = (w1_context * wCtx + w2_resource * wRes + w3_role * wRol) * 100
    return Math.round(cui)
  }

  public classify(cui: number): UrgencyPriority {
    if (cui >= clinicalUrgencyConfig.thresholds.highPriority) return 'HIGH'
    if (cui >= clinicalUrgencyConfig.thresholds.standardPriority) return 'STANDARD'
    return 'BACKGROUND'
  }
}
