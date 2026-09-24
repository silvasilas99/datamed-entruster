import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'patient_identifiers'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.uuid('patient_id').references('id').inTable('patients').onDelete('CASCADE')
      table.uuid('institution_id').references('id').inTable('institutions').onDelete('CASCADE')
      table.string('system').notNullable() // e.g. "urn:oid:1.2.3.4"
      table.string('value').notNullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}