import vine from '@vinejs/vine'

export const createMetadataValidator = vine.compile(
  vine.object({
    resourceType: vine.string().trim(),
    resourceId: vine.string().trim(),
    versionId: vine.string().trim(),
    lastUpdated: vine.string().trim(),
    hash: vine.string().trim(),
    status: vine.string().trim().optional(),
    patientId: vine.string().trim().optional(),
    institutionId: vine.string().trim().optional(),
  })
)

export const searchMetadataValidator = vine.compile(
  vine.object({
    q: vine.string().trim().optional(),
    resourceType: vine.string().trim().optional(),
    resourceId: vine.string().trim().optional(),
    status: vine.string().trim().optional(),
    versionId: vine.string().trim().optional(),
    patientId: vine.string().trim().optional(),
    institutionId: vine.string().trim().optional(),
    startDate: vine.string().trim().optional(),
    endDate: vine.string().trim().optional(),
    from: vine.string().trim().optional(),
    to: vine.string().trim().optional(),
    page: vine.number().min(1).optional(),
    limit: vine.number().min(1).max(100).optional(),
    sortBy: vine
      .enum(['indexedAt', 'updatedAt', 'createdAt', 'resourceType', '_score'] as const)
      .optional(),
    sortOrder: vine.enum(['asc', 'desc'] as const).optional(),
  })
)
