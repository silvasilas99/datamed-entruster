import { randomUUID } from 'node:crypto'
import { beforeCreate, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { PatientSchema } from '#database/schema'
import PatientIdentifier from '#models/healthcare/patient_identifier'

export default class Patient extends PatientSchema {
  @beforeCreate()
  static assignId(patient: Patient) {
    patient.id ||= randomUUID()
  }

  @hasMany(() => PatientIdentifier)
  declare identifiers: HasMany<typeof PatientIdentifier>
}
