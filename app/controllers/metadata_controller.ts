import MetadataDTO from '#dtos/metadata_dto'
import FabricGatewayService from '#services/fabric_gateway_service'
import { createMetadataValidator } from '#validators/metadata_validator'

import type { HttpContext } from '@adonisjs/core/http'

function extractFabricError(error: unknown): string {
  if (!(error instanceof Error)) return String(error)

  const details = (error as Error & { details?: Array<{ message?: string }> }).details
  if (Array.isArray(details) && details.length > 0) {
    const detailMessages = details.map((d) => d.message).filter(Boolean)
    if (detailMessages.length > 0) return detailMessages.join('; ')
  }

  return error.message
}

export default class MetadataController {
  public async store({ request, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(createMetadataValidator)
      const dto = MetadataDTO.fromRequest(payload)

      const fabricService = FabricGatewayService.getInstance()
      await fabricService.initialize()
      await fabricService.createFhirMetadata(JSON.stringify(dto))

      return response.status(201).json({
        message: 'Metadado FHIR registrado na blockchain com sucesso',
        data: dto,
      })
    } catch (error) {
      const message = extractFabricError(error)

      if (/already exists/i.test(message)) {
        return response.status(409).json({
          error: message,
          hint: 'Use um resourceId/versionId diferente, ou um novo hash para uma nova versão.',
        })
      }

      return response.status(500).json({ error: message })
    }
  }

  public async index({ response }: HttpContext) {
    try {
      const fabricService = FabricGatewayService.getInstance()
      await fabricService.initialize()

      const metadata = await fabricService.getAllFhirMetadata()

      return response.json({ data: JSON.parse(metadata) })
    } catch (error) {
      const message = extractFabricError(error)
      return response.status(500).json({ error: message })
    }
  }

  public async show({ params, response }: HttpContext) {
    try {
      const fabricService = FabricGatewayService.getInstance()
      await fabricService.initialize()

      // params.id virá da nossa rota dinâmica
      const metadata = await fabricService.getFhirMetadataById(params.id)

      return response.ok(JSON.parse(metadata))
    } catch (error) {
      return response.status(500).json({ error: (error as Error).message })
    }
  }
}
