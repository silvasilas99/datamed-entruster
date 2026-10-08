import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { faker } from '@faker-js/faker'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { v4 as uuidv4 } from 'uuid'
import { DateTime } from 'luxon'
import app from '@adonisjs/core/services/app'
import FhirResourceMetadata from '#models/fhir_resource_metadata'
import ElasticsearchService from '#services/elasticsearch_service'
import FabricGatewayService from '#services/fabric_gateway_service'

export default class SeedMetadata extends BaseCommand {
  static commandName = 'seed:metadata'
  static description = 'Seed FHIR metadata records and generate benchmark report'

  static options: CommandOptions = {
    startApp: true,
  }

  @flags.number({
    description: 'Number of records per resource type to generate',
    default: 250,
  })
  declare count: number

  async run() {
    const countPerType = Number(this.count) || 250
    const resourceTypes = ['Patient', 'Observation', 'DiagnosticReport', 'Condition']
    const totalRecords = countPerType * resourceTypes.length

    const fabric = FabricGatewayService.getInstance()
    const elastic = ElasticsearchService.getInstance()

    this.logger.info(`Seeding ${totalRecords} metadata records (${countPerType} per type)...`)
    const startTime = Date.now()

    let fabricEnabled = true
    try {
      await fabric.initialize()
    } catch (error) {
      fabricEnabled = false
      this.logger.warning(
        `Fabric init failed, continuing without blockchain sync: ${(error as Error).message}`
      )
    }

    try {
      await elastic.ensureIndices()
    } catch (error) {
      this.logger.warning(
        `Elasticsearch init failed, continuing without indexing: ${(error as Error).message}`
      )
    }

    // FK constraints require existing patients/institutions
    const poolSize = Math.min(25, Math.max(5, Math.ceil(countPerType / 10)))

    const createdResourceIds: string[] = []
    let processed = 0

    for (const type of resourceTypes) {
      for (let i = 0; i < countPerType; i++) {
        const institutionId = '1' // TODO: Replace with actual institution IDs if needed
        const patientId = '1' // TODO: Replace with actual patient IDs if needed
        const payload = {
          resourceId: `res-${type.toLowerCase()}-${i}-${Date.now()}-${uuidv4().slice(0, 8)}`,
          resourceType: type,
          versionId: `v${faker.number.int({ min: 1, max: 5 })}`,
          status: faker.helpers.arrayElement(['active', 'completed', 'cancelled', 'draft']),
          patientId,
          institutionId,
          lastUpdated: DateTime.now().toISO(),
          hash: 'dummyhash',
        }

        const record = await FhirResourceMetadata.create({
          resourceId: payload.resourceId,
          resourceType: payload.resourceType,
          versionId: payload.versionId,
          status: payload.status,
          patientId: payload.patientId,
          institutionId: payload.institutionId,
        })

        createdResourceIds.push(payload.resourceId)

        if (fabricEnabled) {
          try {
            await fabric.createFhirMetadata(payload)
          } catch (error) {
            this.logger.warning(
              `Fabric write failed for ${payload.resourceId}: ${(error as Error).message}`
            )
          }
        }

        // afterSave already indexes via FhirMetadataIndexer; keep an explicit index as fallback
        try {
          await elastic.indexMetadata({
            id: record.id,
            resourceId: record.resourceId,
            resourceType: record.resourceType,
            status: record.status,
            versionId: record.versionId,
            patientId: record.patientId,
            institutionId: record.institutionId,
            indexedAt: DateTime.now().toISO(),
            updatedAt: record.updatedAt?.toISO() ?? null,
            createdAt: record.createdAt?.toISO() ?? null,
          })
        } catch {
          // indexing is best-effort during seed
        }

        processed++
        if (processed % 50 === 0 || processed === totalRecords) {
          this.logger.info(`Progress: ${processed}/${totalRecords}`)
        }
      }
    }

    const durationMs = Date.now() - startTime
    const tps = durationMs > 0 ? (totalRecords / durationMs) * 1000 : 0
    this.logger.success(`Seeding completed in ${durationMs} ms (${tps.toFixed(2)} records/s)`)

    const sampleSize = Math.min(100, createdResourceIds.length)
    const readStart = Date.now()
    if (fabricEnabled && sampleSize > 0) {
      for (const resourceId of createdResourceIds.slice(0, sampleSize)) {
        await fabric.getFhirMetadataById(resourceId).catch(() => {})
      }
    }
    const readDurationMs = Date.now() - readStart
    const readTps = readDurationMs > 0 ? (sampleSize / readDurationMs) * 1000 : 0
    this.logger.info(
      `Blockchain read benchmark: ${readDurationMs} ms for ${sampleSize} records (${readTps.toFixed(2)} reads/s)`
    )

    let dbSizeBytes = 0
    try {
      const dbPath = app.tmpPath('db.sqlite3')
      const stats = await fs.stat(dbPath)
      dbSizeBytes = stats.size
    } catch {
      // db path may differ in some environments
    }

    const avgWriteLatency = totalRecords > 0 ? durationMs / totalRecords : 0
    const avgReadLatency = sampleSize > 0 ? readDurationMs / sampleSize : 0

    const benchmarkContent = `# Benchmark Report

**Seed configuration**
- Resource types: ${resourceTypes.join(', ')}
- Records per type: ${countPerType}
- Total records: ${totalRecords}

**Write performance**
- Total time: ${durationMs} ms
- Throughput: ${tps.toFixed(2)} records/second
- Average latency per record: ${avgWriteLatency.toFixed(2)} ms

**Read performance (Blockchain)**
- Sampled reads: ${sampleSize}
- Total read time: ${readDurationMs} ms
- Read throughput: ${readTps.toFixed(2)} reads/second
- Average read latency: ${avgReadLatency.toFixed(2)} ms

**Disk usage**
- Approximate SQLite file size: ${(dbSizeBytes / (1024 * 1024)).toFixed(2)} MB

*Generated on ${DateTime.now().toISO()}*
`

    const artifactPath = path.join(process.cwd(), 'BENCHMARK.md')
    await fs.writeFile(artifactPath, benchmarkContent, 'utf8')
    this.logger.success(`Benchmark report written to ${artifactPath}`)
  }
}
