import type { HttpContext } from '@adonisjs/core/http'
import DynamicRoutingService from '#services/dynamic_routing_service'
import ElasticsearchService from '#services/elasticsearch_service'
import CouchdbService from '#services/couchdb_service'
import RedisHotCacheService from '#services/redis_hot_cache_service'
import { searchMetadataValidator } from '#validators/metadata_validator'

/**
 * Endpoints de benchmark: saúde dos backends e comparação ES vs CouchDB.
 */
export default class BenchmarkController {
  private routing = new DynamicRoutingService()
  private elastic = ElasticsearchService.getInstance()
  private couch = CouchdbService.getInstance()
  private redis = RedisHotCacheService.getInstance()

  /**
   * GET /api/v1/benchmark/health
   */
  public async health({ response }: HttpContext) {
    const [elastic, couchdb, redis] = await Promise.all([
      this.elastic.ping(),
      this.couch.ping(),
      this.redis.ping(),
    ])

    return response.ok({
      elasticsearch: elastic,
      couchdb,
      redis,
      healthy: elastic || couchdb,
    })
  }

  /**
   * GET /api/v1/benchmark/compare-search
   * Executa a mesma query em Elasticsearch e CouchDB e retorna métricas comparativas.
   */
  public async compareSearch(ctx: HttpContext) {
    const params = await ctx.request.validateUsing(searchMetadataValidator)
    const comparison = await this.routing.compareElasticVsCouchdb(params)

    return ctx.response.ok({
      query: params,
      ...comparison,
      measuredAt: new Date().toISOString(),
    })
  }
}
