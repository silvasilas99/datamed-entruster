import Patient from '#models/healthcare/patient'
import PatientIdentifier from '#models/healthcare/patient_identifier'
import db from '@adonisjs/lucid/services/db'

type PatientIdentifierInput = {
  system: string
  value: string
  institutionId: string
}

/**
 * Serviço de gerenciamento de pacientes.
 *
 * Centraliza as regras de negócio sobre criação, busca e atualização
 * de pacientes e seus identificadores clínicos.
 */
export default class PatientService {
  /**
   * Cria um paciente e seus identificadores em uma única transação atômica.
   */
  async create(identifiers: PatientIdentifierInput[] = []): Promise<Patient> {
    const patient = await db.transaction(async (trx) => {
      const newPatient = new Patient()
      newPatient.useTransaction(trx)
      await newPatient.save()

      if (identifiers.length > 0) {
        await newPatient.related('identifiers').createMany(identifiers, { client: trx })
      }

      return newPatient
    })

    await patient.load('identifiers')
    return patient
  }

  /**
   * Busca um paciente pelo valor de um dos seus identificadores (ex: CPF, prontuário).
   *
   * @param system - O sistema de identificação (ex: "urn:oid:br.gov.ans.cpf")
   * @param value  - O valor do identificador
   */
  async findByIdentifier(system: string, value: string): Promise<Patient | null> {
    const identifier = await PatientIdentifier.query()
      .where('system', system)
      .where('value', value)
      .first()

    if (!identifier || !identifier.patientId) return null

    return Patient.query().where('id', identifier.patientId).preload('identifiers').first()
  }

  /**
   * Adiciona novos identificadores a um paciente existente.
   */
  async addIdentifiers(
    patientId: string,
    identifiers: PatientIdentifierInput[]
  ): Promise<Patient> {
    const patient = await Patient.findOrFail(patientId)
    await patient.related('identifiers').createMany(identifiers)
    await patient.load('identifiers')
    return patient
  }

  /**
   * Remove um identificador específico de um paciente.
   */
  async removeIdentifier(identifierId: string): Promise<void> {
    const identifier = await PatientIdentifier.findOrFail(identifierId)
    await identifier.delete()
  }
}
