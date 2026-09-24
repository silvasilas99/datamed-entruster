import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('institutions', (table) => {
      table.index(['name'])
    })

    this.schema.alterTable('patient_identifiers', (table) => {
      table.index(['patient_id'])
      table.index(['institution_id'])
      table.index(['system', 'value'])
    })

    this.schema.alterTable('fhir_resource_metadata', (table) => {
      table.index(['patient_id'])
      table.index(['institution_id'])
      table.index(['resource_type', 'resource_id'])
      table.index(['status'])
    })
  }

  async down() {
    this.schema.alterTable('fhir_resource_metadata', (table) => {
      table.dropIndex(['patient_id'])
      table.dropIndex(['institution_id'])
      table.dropIndex(['resource_type', 'resource_id'])
      table.dropIndex(['status'])
    })

    this.schema.alterTable('patient_identifiers', (table) => {
      table.dropIndex(['patient_id'])
      table.dropIndex(['institution_id'])
      table.dropIndex(['system', 'value'])
    })

    this.schema.alterTable('institutions', (table) => {
      table.dropIndex(['name'])
    })
  }
}