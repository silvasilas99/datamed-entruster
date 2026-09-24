import { randomUUID } from 'node:crypto'
import { afterDelete, afterSave, beforeCreate, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { FhirResourceMetadatumSchema } from '#database/schema'
import Patient from '#models/healthcare/patient'
import Institution from '#models/healthcare/institution'
import emitter from '@adonisjs/core/services/emitter'
import FhirMetadataSaved from '#events/healthcare/fhir_metadata_saved'
import FhirMetadataDeleted from '#events/healthcare/fhir_metadata_deleted'

export default class FhirResourceMetadata extends FhirResourceMetadatumSchema {
  @beforeCreate()
  static assignId(metadata: FhirResourceMetadata) {
    metadata.id ||= randomUUID()
  }

  @afterSave()
  static async dispatchSaved(metadata: FhirResourceMetadata) {
    await emitter.emit(FhirMetadataSaved, new FhirMetadataSaved(metadata))
  }

  @afterDelete()
  static async dispatchDeleted(metadata: FhirResourceMetadata) {
    await emitter.emit(FhirMetadataDeleted, new FhirMetadataDeleted(metadata.id))
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
