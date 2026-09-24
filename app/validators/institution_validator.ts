import vine from '@vinejs/vine'

export const createInstitutionValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2),
  })
)
