import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import ElasticsearchService from '#services/elasticsearch_service'
import CouchdbService from '#services/couchdb_service'
import FhirResourceMetadata from '#models/fhir_resource_metadata'
import { DateTime } from 'luxon'

export default class ElasticSync extends BaseCommand {
  static commandName = 'elastic:sync'
  static description =
    'Garante índices e sincroniza registros do banco para Elasticsearch e CouchDB (benchmark)'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    this.logger.info('Iniciando sincronização com Elasticsearch e CouchDB...')

    const es = ElasticsearchService.getInstance()
    const couch = CouchdbService.getInstance()

    try {
      const pingOk = await es.ping()
      if (!pingOk) {
        this.logger.error(
          'Não foi possível conectar ao cluster Elasticsearch em ' + process.env.ELASTICSEARCH_URL
        )
        return
      }

      this.logger.info('Conexão com Elasticsearch confirmada.')

      this.logger.info('Garantindo índices fhir_metadata e institutions...')
      await es.ensureIndices()
      this.logger.success('Índices Elasticsearch configurados.')

      const couchOk = await couch.ping()
      if (couchOk) {
        await couch.ensureDatabase()
        this.logger.success('Database CouchDB fhir_metadata pronta.')
      } else {
        this.logger.warning('CouchDB indisponível — sincronização CouchDB será ignorada.')
      }

      // const institutions = await Institution.all()
      // this.logger.info(`Sincronizando ${institutions.length} instituição(ões)...`)
      // for (const inst of institutions) {
      //   await es.indexInstitution({
      //     id: inst.id,
      //     name: inst.name,
      //     createdAt: inst.createdAt?.toISO() ?? null,
      //     updatedAt: inst.updatedAt?.toISO() ?? null,
      //   })
      // }
      // this.logger.success(`${institutions.length} instituição(ões) indexada(s) no ES.`)

      const metadataList = await FhirResourceMetadata.all()
      this.logger.info(`Sincronizando ${metadataList.length} metadado(s) FHIR...`)
      let couchCount = 0
      for (const meta of metadataList) {
        const doc = {
          id: String(meta.id),
          resourceId: meta.resourceId,
          resourceType: meta.resourceType,
          status: meta.status,
          versionId: meta.versionId,
          patientId: meta.patientId,
          institutionId: meta.institutionId,
          indexedAt: DateTime.now().toISO(),
          updatedAt: meta.updatedAt?.toISO() ?? null,
          createdAt: meta.createdAt?.toISO() ?? null,
        }

        await es.indexMetadata(doc)

        if (couchOk) {
          await couch.indexMetadata(doc)
          couchCount++
        }

        meta.indexedAt = DateTime.now()
        await meta.save()
      }
      this.logger.success(`${metadataList.length} metadado(s) indexado(s) no Elasticsearch.`)
      if (couchOk) {
        this.logger.success(`${couchCount} metadado(s) espelhado(s) no CouchDB.`)
      }

      this.logger.success('Sincronização concluída com êxito!')
    } catch (error) {
      this.logger.error(`Erro durante a sincronização: ${(error as Error).message}`)
    }
  }
}
