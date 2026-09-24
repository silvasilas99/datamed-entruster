import { randomUUID } from 'node:crypto'
import { beforeCreate } from '@adonisjs/lucid/orm'
import { InstitutionSchema } from '#database/schema'

export default class Institution extends InstitutionSchema {
  @beforeCreate()
  static assignId(institution: Institution) {
    institution.id ||= randomUUID()
  }
}
