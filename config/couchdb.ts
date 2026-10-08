import env from '#start/env'

/**
 * CouchDB espelha o world-state rich-query do Hyperledger Fabric (peer state DB),
 * permitindo comparar latência de consultas Mango vs Elasticsearch off-chain.
 */
export const couchdbConfig = {
  url: env.get('COUCHDB_URL', 'http://localhost:5984'),
  username: env.get('COUCHDB_USERNAME', 'admin'),
  password: env.get('COUCHDB_PASSWORD', 'password'),
  metadataDb: env.get('COUCHDB_METADATA_DB', 'fhir_metadata'),
}

export default couchdbConfig
