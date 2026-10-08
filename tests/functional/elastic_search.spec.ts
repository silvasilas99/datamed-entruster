import { test } from '@japa/runner'
import ElasticsearchService from '#services/elasticsearch_service'
import FhirResourceMetadata from '#models/fhir_resource_metadata'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'

test.group('Elasticsearch Integration & Search Routes', (group) => {
  const es = ElasticsearchService.getInstance()

  group.setup(async () => {
    await es.ensureIndices()
  })

  test('Elasticsearch cluster está saudável e responsivo (ping)', async ({ assert }) => {
    const isHealthy = await es.ping()
    assert.isTrue(isHealthy)
  })

  test('Indexação e busca de instituições no Elasticsearch', async ({ assert }) => {
    const instId = randomUUID()
    const instName = `Hospital Santa Casa ${randomUUID().substring(0, 8)}`

    // 1. Indexar instituição diretamente
    await es.indexInstitution({
      id: instId,
      name: instName,
      createdAt: DateTime.now().toISO(),
      updatedAt: DateTime.now().toISO(),
    })

    // Aguarda atualização de refresh do índice no ES
    await es.getClient().indices.refresh({ index: 'institutions' })

    // 2. Buscar por nome exato / prefixo
    const result = await es.searchInstitutions({ q: 'Santa Casa' })
    assert.isAbove(result.data.length, 0)
    assert.isTrue(result.data.some((item) => item.id === instId))

    // 3. Remover instituição do índice
    await es.removeInstitution(instId)
    await es.getClient().indices.refresh({ index: 'institutions' })

    const resultAfterDelete = await es.searchInstitutions({ q: instId })
    assert.isFalse(resultAfterDelete.data.some((item) => item.id === instId))
  })

  test('Indexação e busca otimizada de metadados FHIR no Elasticsearch', async ({ assert }) => {
    const metaId = randomUUID()
    const patientId = randomUUID()
    const institutionId = randomUUID()
    const resourceId = `pat-${randomUUID().substring(0, 6)}`

    // 1. Indexar metadado
    await es.indexMetadata({
      id: metaId,
      resourceId,
      resourceType: 'Patient',
      status: 'active',
      versionId: '1.0',
      patientId,
      institutionId,
      indexedAt: DateTime.now().toISO(),
      updatedAt: DateTime.now().toISO(),
      createdAt: DateTime.now().toISO(),
    })

    await es.getClient().indices.refresh({ index: 'fhir_metadata' })

    // 2. Busca com filtro exato por resourceType e status
    const resultFiltered = await es.searchMetadata({
      resourceType: 'Patient',
      status: 'active',
      resourceId,
    })
    assert.equal(resultFiltered.data.length, 1)
    assert.equal(resultFiltered.data[0].id, metaId)
    assert.equal(resultFiltered.data[0].resourceId, resourceId)

    // 3. Busca textual abrangente (q)
    const resultText = await es.searchMetadata({
      q: resourceId,
    })
    assert.isAbove(resultText.data.length, 0)
    assert.equal(resultText.data[0].id, metaId)

    // 4. Limpeza
    await es.removeMetadata(metaId)
    await es.getClient().indices.refresh({ index: 'fhir_metadata' })
  })

  test('Eventos de ciclo de vida do modelo Institution sincronizam no Elasticsearch', async ({
    assert,
  }) => {
    const instName = `Clínica Einstein ${randomUUID().substring(0, 6)}`

    // Criação do model -> dispara @afterSave -> InstitutionSaved -> InstitutionIndexer -> ES
    const institution = await Institution.create({
      name: instName,
    })

    // Dá um breve tempo para o listener e faz refresh do índice
    await new Promise((resolve) => setTimeout(resolve, 500))
    await es.getClient().indices.refresh({ index: 'institutions' })

    const searchResult = await es.searchInstitutions({ q: instName })
    assert.isTrue(searchResult.data.some((item) => item.id === institution.id))

    const instId = institution.id
    // Exclusão -> dispara @afterDelete -> InstitutionDeleted -> InstitutionIndexer -> ES
    await institution.delete()

    await new Promise((resolve) => setTimeout(resolve, 500))
    await es.getClient().indices.refresh({ index: 'institutions' })

    const searchAfterDelete = await es.searchInstitutions({ q: instId })
    assert.isFalse(searchAfterDelete.data.some((item) => item.id === instId))

  })

  test('Eventos de ciclo de vida de FhirResourceMetadata sincronizam no Elasticsearch', async ({
    assert,
  }) => {
    const resourceId = `obs-${randomUUID().substring(0, 6)}`

    const metadata = await FhirResourceMetadata.create({
      resourceId,
      resourceType: 'Observation',
      status: 'final',
      versionId: '1.0',
    })

    await new Promise((resolve) => setTimeout(resolve, 500))
    await es.getClient().indices.refresh({ index: 'fhir_metadata' })

    const searchResult = await es.searchMetadata({ resourceId })
    assert.isTrue(searchResult.data.some((item) => item.id === metadata.id))

    await metadata.delete()

    await new Promise((resolve) => setTimeout(resolve, 500))
    await es.getClient().indices.refresh({ index: 'fhir_metadata' })

    const searchAfterDelete = await es.searchMetadata({ resourceId })
    assert.isFalse(searchAfterDelete.data.some((item) => item.id === metadata.id))
  })

  test('Endpoint HTTP: GET /api/v1/metadata/search retorna metadados indexados', async ({
    client,
    assert,
  }) => {
    const resourceId = `diag-${randomUUID().substring(0, 6)}`

    const metadata = await FhirResourceMetadata.create({
      resourceId,
      resourceType: 'DiagnosticReport',
      status: 'preliminary',
      versionId: '1.0',
    })

    await new Promise((resolve) => setTimeout(resolve, 500))
    await es.getClient().indices.refresh({ index: 'fhir_metadata' })

    const response = await client
      .get('/api/v1/metadata/search')
      .qs({ resourceType: 'DiagnosticReport', resourceId })

    response.assertStatus(200)
    const body = response.body()
    assert.isDefined(body.data)
    assert.isDefined(body.meta)
    assert.isTrue(body.data.some((item: any) => item.id === metadata.id))

    // Cleanup
    await metadata.delete()
  })

  test('Endpoint HTTP: GET /api/v1/institutions/search busca instituições indexadas', async ({
    client,
    assert,
  }) => {
    const instName = `Hospital Municipal ${randomUUID().substring(0, 6)}`
    const institution = await Institution.create({ name: instName })

    await new Promise((resolve) => setTimeout(resolve, 500))
    await es.getClient().indices.refresh({ index: 'institutions' })

    const response = await client
      .get('/api/v1/institutions/search')
      .qs({ q: instName })

    response.assertStatus(200)
    const body = response.body()
    assert.isDefined(body.data)
    assert.isTrue(body.data.some((item: any) => item.id === institution.id))

    // Cleanup
    await institution.delete()
  })
})
