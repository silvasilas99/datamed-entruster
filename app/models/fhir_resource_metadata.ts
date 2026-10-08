import { randomUUID } from 'node:crypto'
import { afterDelete, afterSave, beforeCreate } from '@adonisjs/lucid/orm'
import { FhirResourceMetadatumSchema } from '#database/schema'
import emitter from '@adonisjs/core/services/emitter'
import FhirMetadataSaved from '#events/fhir_metadata_saved'
import FhirMetadataDeleted from '#events/fhir_metadata_deleted'

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

  get needsIndexing(): boolean {
    if (!this.indexedAt || !this.updatedAt) return true
    return this.indexedAt < this.updatedAt
  }
}
