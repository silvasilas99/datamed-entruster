import { randomUUID } from 'node:crypto'
import { beforeCreate, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { FhirResourceMetadatumSchema } from '#database/schema'
import Patient from '#models/healthcare/patient'
import Institution from '#models/healthcare/institution'

export default class FhirResourceMetadata extends FhirResourceMetadatumSchema {
  @beforeCreate()
  static assignId(metadata: FhirResourceMetadata) {
    metadata.id ||= randomUUID()
  }

  @belongsTo(() => Institution)
  declare institution: BelongsTo<typeof Institution>

  @belongsTo(() => Patient)
  declare patient: BelongsTo<typeof Patient>

  get needsIndexing(): boolean {
    if (!this.indexedAt || !this.updatedAt) return true
    return this.indexedAt < this.updatedAt
  }
}
