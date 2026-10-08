import { test } from '@japa/runner'
import CuiCalculatorService from '#services/cui_calculator_service'

test.group('CuiCalculatorService', () => {
  const calculator = new CuiCalculatorService()

  test('emergência com AllergyIntolerance e EmergencyPhysician → HIGH (CUI >= 75)', ({
    assert,
  }) => {
    const cui = calculator.calculate('EMER', 'AllergyIntolerance', 'EmergencyPhysician')
    // 0.5*1 + 0.3*1 + 0.2*1 = 1.0 → 100
    assert.equal(cui, 100)
    assert.equal(calculator.classify(cui), 'HIGH')
  })

  test('ambulatorial Patient com Nurse → STANDARD', ({ assert }) => {
    const cui = calculator.calculate('AMB', 'Patient', 'Nurse')
    // 0.5*0.5 + 0.3*0.6 + 0.2*0.7 = 0.25+0.18+0.14 = 0.57 → 57
    assert.equal(cui, 57)
    assert.equal(calculator.classify(cui), 'STANDARD')
  })

  test('faturamento Invoice com AdministrativeStaff → BACKGROUND', ({ assert }) => {
    const cui = calculator.calculate('BUS', 'Invoice', 'AdministrativeStaff')
    // 0.5*0.1 + 0.3*0.1 + 0.2*0.1 = 0.1 → 10
    assert.equal(cui, 10)
    assert.equal(calculator.classify(cui), 'BACKGROUND')
  })

  test('auditoria AuditEvent com Auditor → BACKGROUND', ({ assert }) => {
    const cui = calculator.calculate('BUS', 'AuditEvent', 'Auditor')
    // 0.5*0.1 + 0.3*0.1 + 0.2*0.2 = 0.05+0.03+0.04 = 0.12 → 12
    assert.equal(cui, 12)
    assert.equal(calculator.classify(cui), 'BACKGROUND')
  })
})
