import type { HttpContext } from '@adonisjs/core/http'
import Institution from '#models/healthcare/institution'
import { createInstitutionValidator } from '#validators/institution_validator'

export default class InstitutionsController {
  async index({ response }: HttpContext) {
    const institutions = await Institution.all()
    return response.ok(institutions)
  }

  async store({ request, response }: HttpContext) {
    const payload = await request.validateUsing(createInstitutionValidator)
    const institution = await Institution.create(payload)
    return response.created(institution)
  }

  async show({ params, response }: HttpContext) {
    const institution = await Institution.findOrFail(params.id)
    return response.ok(institution)
  }

  async update({ params, request, response }: HttpContext) {
    const institution = await Institution.findOrFail(params.id)
    const payload = await request.validateUsing(createInstitutionValidator)

    institution.merge(payload)
    await institution.save()

    return response.ok(institution)
  }

  async destroy({ params, response }: HttpContext) {
    const institution = await Institution.findOrFail(params.id)
    await institution.delete()
    return response.noContent()
  }
}