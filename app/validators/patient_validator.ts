import vine from '@vinejs/vine'

export const createPatientValidator = vine.compile(
  vine.object({
    identifiers: vine
      .array(
        vine.object({
          system: vine.string().trim(),
          value: vine.string().trim(),
          institutionId: vine.string().uuid(),
        })
      )
      .optional(),
  })
)

export const addIdentifiersValidator = vine.compile(
  vine.object({
    identifiers: vine.array(
      vine.object({
        system: vine.string().trim(),
        value: vine.string().trim(),
        institutionId: vine.string().uuid(),
      })
    ),
  })
)
