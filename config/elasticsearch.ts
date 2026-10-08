import env from '#start/env'

export const elasticsearchConfig = {
  url: env.get('ELASTICSEARCH_URL', 'http://localhost:9200'),
  apiKey: env.get('ELASTICSEARCH_API_KEY'),
}

export default elasticsearchConfig
