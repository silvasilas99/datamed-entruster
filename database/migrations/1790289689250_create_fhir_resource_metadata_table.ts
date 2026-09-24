import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'fhir_resource_metadata'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.uuid('patient_id').references('id').inTable('patients').onDelete('CASCADE')
      table.uuid('institution_id').references('id').inTable('institutions').onDelete('CASCADE')
      table.string('resource_type').notNullable() // e.g. "Patient", "Observation"
      table.string('resource_id').notNullable()
      table.string('version_id').nullable()
      table.string('status').nullable()
      
      table.timestamp('indexed_at').nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}