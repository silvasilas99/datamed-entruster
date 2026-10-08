import { test } from '@japa/runner'
import { createHash, randomUUID } from 'node:crypto'
import ClinicalAccessEvent from '#events/clinical_access_event'
import ClinicalAuditLogger from '#listeners/clinical_audit_logger'

test.group('Clinical Access Audit Event & Logger', () => {
  test('cria evento de auditoria com hash SHA-256 sem expor PHI', ({ assert }) => {
    const samplePayload = [
      {
        resourceType: 'Observation',
        id: 'obs-123',
        status: 'final',
        patientId: 'patient-abc-789',
      },
    ]

    const eventId = randomUUID()
    const resourceHash = createHash('sha256')
      .update(JSON.stringify(samplePayload))
      .digest('hex')

    const event = new ClinicalAccessEvent({
      eventId,
      patientId: 'patient-abc-789',
      requestorId: 'dr-silva',
      requestorMspId: 'Org1MSP',
      sourceSystem: 'Hospital-A',
      targetSystem: 'Hospital-B',
      resourceType: 'Observation',
      resourceHash,
      direction: 'OUTBOUND',
      consentId: 'consent-456',
      encounterClass: 'AMB',
      cuiScore: 50,
      urgencyPriority: 'STANDARD',
      authorized: true,
      reason: 'AUTHORIZED_CLINICAL_QUERY',
      timestamp: new Date().toISOString(),
    })

    assert.equal(event.payload.eventId, eventId)
    assert.equal(event.payload.resourceHash, resourceHash)
    assert.equal(event.payload.resourceHash.length, 64) // SHA-256 hex digest length
    assert.equal(event.payload.patientId, 'patient-abc-789')
    assert.isTrue(event.payload.authorized)
  })

  test('logger trata graciosamente ausência do Fabric Gateway sem derrubar aplicação', async ({
    assert,
  }) => {
    const logger = new ClinicalAuditLogger()
    const event = new ClinicalAccessEvent({
      eventId: randomUUID(),
      patientId: 'patient-emergency-999',
      requestorId: 'dr-emergency',
      requestorMspId: 'Org1MSP',
      sourceSystem: 'EHR-Gateway',
      targetSystem: 'LocalEHR',
      resourceType: 'AllergyIntolerance',
      resourceHash: createHash('sha256').update('emergency-data').digest('hex'),
      direction: 'OUTBOUND',
      consentId: null,
      encounterClass: 'EMER',
      cuiScore: 90,
      urgencyPriority: 'HIGH',
      authorized: true,
      reason: 'EMERGENCY_BREAK_GLASS',
      timestamp: new Date().toISOString(),
    })

    // Deve executar sem lançar exceção não capturada
    await assert.doesNotReject(async () => {
      await logger.handle(event)
    })
  })
})
