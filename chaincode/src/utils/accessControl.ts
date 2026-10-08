import { Context } from 'fabric-contract-api'
import { ConsentRecord, STATUS } from '../entities/ConsentRecord'

export const ROLES = Object.freeze({
  DATA_CONTROLLER: 'data-controller',
  CLINICIAN: 'clinician',
  AUDITOR: 'auditor',
  PATIENT: 'patient',
})

export interface ClientInfo {
  id: string
  mspId: string
  role: string | null
}

export function getClientInfo(ctx: Context): ClientInfo {
  return {
    id: ctx.clientIdentity.getID(),
    mspId: ctx.clientIdentity.getMSPID(),
    role: ctx.clientIdentity.getAttributeValue('role'),
  }
}

export function requireRole(ctx: Context, allowedRoles: string[]) {
  const { role } = getClientInfo(ctx)
  if (!role || !allowedRoles.includes(role)) {
    throw new Error(
      `Access denied: caller role '${
        role || 'none'
      }' is not permitted to perform this action (requires one of: ${allowedRoles.join(', ')})`
    )
  }
}

export function requireSelfOrRole(ctx: Context, patientId: string, otherAllowedRoles: string[]) {
  const { role, id } = getClientInfo(ctx)
  const isSelf = role === ROLES.PATIENT && id.includes(patientId)
  if (isSelf) {
    return
  }
  requireRole(ctx, otherAllowedRoles)
}

export function evaluateConsentAccess(
  consent: ConsentRecord | null,
  resourceType: string,
  atIsoTimestamp: string
): { allowed: boolean; reason: string } {
  if (!consent) {
    return {
      allowed: false,
      reason: 'No consent record found for this patient/data controller pair',
    }
  }
  if (!consent.isActiveAt(atIsoTimestamp)) {
    return {
      allowed: false,
      reason: `Consent ${consent.consentId} is not active at ${atIsoTimestamp} (status: ${consent.status})`,
    }
  }
  if (!consent.covers(resourceType)) {
    return {
      allowed: false,
      reason: `Consent ${consent.consentId} does not cover resource type '${resourceType}'`,
    }
  }
  return {
    allowed: true,
    reason: `Consent ${consent.consentId} authorizes '${resourceType}'`,
  }
}
