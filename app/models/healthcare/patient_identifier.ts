import { randomUUID } from 'node:crypto'
import { beforeCreate, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { PatientIdentifierSchema } from '#database/schema'
import Patient from '#models/healthcare/patient'
import Institution from '#models/healthcare/institution'

export default class PatientIdentifier extends PatientIdentifierSchema {
  @beforeCreate()
  static assignId(identifier: PatientIdentifier) {
    identifier.id ||= randomUUID()
  }

  @belongsTo(() => Patient)
  declare patient: BelongsTo<typeof Patient>

  @belongsTo(() => Institution)
  declare institution: BelongsTo<typeof Institution>
}
