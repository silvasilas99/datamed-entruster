/**
 * Pesos e limiares do Clinical Urgency Index (CUI).
 * CUI = (w1 * W_ctx + w2 * W_res + w3 * W_rol) * 100
 */
export const clinicalUrgencyConfig = {
  weights: {
    w1_context: 0.5,
    w2_resource: 0.3,
    w3_role: 0.2,
  },
  contextWeights: {
    EMER: 1.0,
    IMP: 0.8,
    AMB: 0.5,
    BUS: 0.1,
  },
  resourceWeights: {
    AllergyIntolerance: 1.0,
    'Observation/vital-signs': 0.9,
    DiagnosticReport: 0.7,
    Patient: 0.6,
    Invoice: 0.1,
    AuditEvent: 0.1,
  },
  roleWeights: {
    EmergencyPhysician: 1.0,
    AttendingPhysician: 0.8,
    Nurse: 0.7,
    Auditor: 0.2,
    AdministrativeStaff: 0.1,
  },
  thresholds: {
    highPriority: 75,
    standardPriority: 30,
  },
  redis: {
    hotKeyPrefix: 'fhir:hot:',
    ttlSeconds: 1800,
  },
  throttling: {
    backgroundDelayMs: 50,
  },
} as const

export type EncounterClass = keyof typeof clinicalUrgencyConfig.contextWeights
export type FhirResourceWeightKey = keyof typeof clinicalUrgencyConfig.resourceWeights
export type ClinicalRole = keyof typeof clinicalUrgencyConfig.roleWeights
export type UrgencyPriority = 'HIGH' | 'STANDARD' | 'BACKGROUND'

export default clinicalUrgencyConfig
