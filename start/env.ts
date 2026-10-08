/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  // Node
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  // App
  APP_KEY: Env.schema.secret(),
  APP_URL: Env.schema.string({ format: 'url', tld: false }),

  // Session
  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory', 'database'] as const),

  // Elasticsearch
  ELASTICSEARCH_URL: Env.schema.string.optional(),
  ELASTICSEARCH_API_KEY: Env.schema.string.optional(),

  // Redis (hot-cache para Clinical Urgency Routing)
  REDIS_HOST: Env.schema.string.optional(),
  REDIS_PORT: Env.schema.number.optional(),
  REDIS_PASSWORD: Env.schema.string.optional(),
  REDIS_DB: Env.schema.number.optional(),
  REDIS_KEY_PREFIX: Env.schema.string.optional(),
  REDIS_OPTIONAL: Env.schema.boolean.optional(),

  // CouchDB (espelho do state DB / rich-query para benchmark vs Elasticsearch)
  COUCHDB_URL: Env.schema.string.optional(),
  COUCHDB_USERNAME: Env.schema.string.optional(),
  COUCHDB_PASSWORD: Env.schema.string.optional(),
  COUCHDB_METADATA_DB: Env.schema.string.optional(),

  // Clinical Audit & Blockchain Logging
  CLINICAL_AUDIT_ENABLED: Env.schema.boolean.optional(),
  CLINICAL_AUDIT_STRICT_CONSENT: Env.schema.boolean.optional(),
})

