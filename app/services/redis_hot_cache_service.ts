import { Redis } from 'ioredis'
import logger from '@adonisjs/core/services/logger'
import redisConfig from '#config/redis'
import { clinicalUrgencyConfig } from '#config/clinical_urgency'

/**
 * Cache em memória (Redis) para leituras de alta urgência clínica (CUI HIGH).
 * Usa ioredis diretamente — @adonisjs/redis v11 conflita com peer de @adonisjs/session@8.
 */
export default class RedisHotCacheService {
  private static instance: RedisHotCacheService
  private client: Redis | null = null

  static getInstance(): RedisHotCacheService {
    if (!RedisHotCacheService.instance) {
      RedisHotCacheService.instance = new RedisHotCacheService()
    }
    return RedisHotCacheService.instance
  }

  private getClient(): Redis {
    if (!this.client) {
      this.client = new Redis({
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password || undefined,
        db: redisConfig.db,
        keyPrefix: redisConfig.keyPrefix,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        connectTimeout: 1500,
        commandTimeout: 1500,
        family: 4,
        retryStrategy: () => null,
      })

      this.client.on('error', (err: Error) => {
        if (!redisConfig.optional) {
          logger.error({ err }, '[Redis] Erro de conexão')
        }
      })
    }
    return this.client
  }

  private async ensureConnected(): Promise<Redis | null> {
    const client = this.getClient()
    try {
      if (client.status === 'wait' || client.status === 'end') {
        await client.connect()
      }
      return client
    } catch (error) {
      logger.warn({ err: error }, '[Redis] Indisponível')
      return null
    }
  }

  async ping(): Promise<boolean> {
    try {
      const client = await this.ensureConnected()
      if (!client) return false
      const pong = await client.ping()
      return pong === 'PONG'
    } catch {
      return false
    }
  }

  hotKey(patientHash: string): string {
    return `${clinicalUrgencyConfig.redis.hotKeyPrefix}${patientHash}`
  }

  async get<T = unknown>(patientHash: string): Promise<T | null> {
    try {
      const client = await this.ensureConnected()
      if (!client) return null
      const raw = await client.get(this.hotKey(patientHash))
      if (!raw) return null
      return JSON.parse(raw) as T
    } catch (error) {
      logger.warn({ err: error }, '[Redis] Falha em GET; tratando como miss')
      return null
    }
  }

  async set(patientHash: string, value: unknown, ttlSeconds?: number): Promise<void> {
    try {
      const client = await this.ensureConnected()
      if (!client) return
      const ttl = ttlSeconds ?? clinicalUrgencyConfig.redis.ttlSeconds
      await client.set(this.hotKey(patientHash), JSON.stringify(value), 'EX', ttl)
    } catch (error) {
      logger.warn({ err: error }, '[Redis] Falha em SET; cache ignorado')
    }
  }

  async del(patientHash: string): Promise<void> {
    try {
      const client = await this.ensureConnected()
      if (!client) return
      await client.del(this.hotKey(patientHash))
    } catch {
      // ignore
    }
  }

  async disconnect(): Promise<void> {
    if (!this.client) return
    try {
      await this.client.quit()
    } catch {
      this.client.disconnect()
    } finally {
      this.client = null
    }
  }
}
