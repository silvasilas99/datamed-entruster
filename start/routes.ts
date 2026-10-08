/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'
import AutoSwagger from 'adonis-autoswagger'
import swaggerConfig from '#config/swagger'

router.get('/swagger', async () => {
  return AutoSwagger.default.docs(router.toJSON(), swaggerConfig)
})

router.get('/docs', async () => {
  return AutoSwagger.default.ui('/swagger', swaggerConfig)
})

router.get('/', () => {
  return { hello: 'world' }
})

router
  .group(() => {
    router
      .group(() => {
        router.post('signup', [controllers.NewAccount, 'store'])
        router.post('login', [controllers.AccessTokens, 'store'])
      })
      .prefix('auth')
      .as('auth')

    router
      .group(() => {
        router.get('profile', [controllers.Profile, 'show'])
        router.post('logout', [controllers.AccessTokens, 'destroy'])
      })
      .prefix('account')
      .as('profile')
      .use(middleware.auth())

    // Metadados FHIR (busca otimizada e blockchain)
    router.post('/metadata', [controllers.Metadata, 'store'])
    router.get('/metadata/search', [controllers.Metadata, 'search'])
    router.get('/metadata/elastic-list', [controllers.Metadata, 'elasticList'])
    router.get('/metadata', [controllers.Metadata, 'index'])
    router.get('/metadata/:id', [controllers.Metadata, 'show'])

    // Clinical Urgency Routing (Redis hot-cache / State DB / Elasticsearch)
    router
      .group(() => {
        router.get('/metadata/:patientHash', [controllers.ClinicalQuery, 'fetchPatientMetadata'])
      })
      .prefix('clinical')
      .use(middleware.clinicalUrgency())

    // Benchmark: saúde dos backends e comparação Elasticsearch vs CouchDB
    router.get('/benchmark/health', [controllers.Benchmark, 'health'])
    router.get('/benchmark/compare-search', [controllers.Benchmark, 'compareSearch'])
  })
  .prefix('/api/v1')
