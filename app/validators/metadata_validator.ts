import vine from '@vinejs/vine'

export const createMetadataValidator = vine.create({
  resourceType: vine.string().trim(),
  resourceId: vine.string().trim(),
  versionId: vine.string().trim(),
  lastUpdated: vine.string().trim(),
  hash: vine.string().trim(),
})
