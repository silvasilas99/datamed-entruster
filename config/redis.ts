import env from '#start/env'

export const redisConfig = {
  host: env.get('REDIS_HOST', '127.0.0.1'),
  port: env.get('REDIS_PORT', 6379),
  password: env.get('REDIS_PASSWORD'),
  db: env.get('REDIS_DB', 0),
  keyPrefix: env.get('REDIS_KEY_PREFIX', 'datamed:'),
  /**
   * Quando true, falhas de conexão não derrubam o roteamento:
   * o DynamicRoutingService cai automaticamente para State DB / Elasticsearch.
   */
  optional: env.get('REDIS_OPTIONAL', true),
}

export default redisConfig
