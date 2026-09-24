import type { HttpContext } from '@adonisjs/core/http'
import Patient from '#models/healthcare/patient'
import PatientService from '#services/healthcare/patient_service'
import { createPatientValidator, addIdentifiersValidator } from '#validators/patient_validator'

export default class PatientsController {
  private patientService = new PatientService()

  async index({ response }: HttpContext) {
    const patients = await Patient.query().preload('identifiers')
    return response.ok(patients)
  }

  async store({ request, response }: HttpContext) {
    const payload = await request.validateUsing(createPatientValidator)
    const patient = await this.patientService.create(payload.identifiers ?? [])
    return response.created(patient)
  }

  async show({ params, response }: HttpContext) {
    const patient = await Patient.query()
      .where('id', params.id)
      .preload('identifiers')
      .firstOrFail()
    return response.ok(patient)
  }

  /**
   * Adiciona identificadores clínicos a um paciente existente.
   * Rota: POST /api/v1/patients/:id/identifiers
   */
  async addIdentifiers({ params, request, response }: HttpContext) {
    const payload = await request.validateUsing(addIdentifiersValidator)
    const patient = await this.patientService.addIdentifiers(params.id, payload.identifiers)
    return response.created(patient)
  }

  /**
   * Remove um identificador clínico de um paciente.
   * Rota: DELETE /api/v1/patients/:id/identifiers/:identifierId
   */
  async removeIdentifier({ params, response }: HttpContext) {
    await this.patientService.removeIdentifier(params.identifierId)
    return response.noContent()
  }

  async destroy({ params, response }: HttpContext) {
    const patient = await Patient.findOrFail(params.id)
    await patient.delete()
    return response.noContent()
  }
}