import path from 'node:path'
import url from 'node:url'

export default {
  path: path.dirname(url.fileURLToPath(import.meta.url)) + '/../',
  title: 'Datamed Entruster API',
  version: '1.0.0',
  description: 'API para gerenciamento de metadados FHIR e Clinical Urgency Routing na Blockchain',
  tagIndex: 2,
  ignore: ['/swagger', '/docs'],
  preferredPutPatch: 'PUT',
  common: {
    parameters: {},
    headers: {},
  },
  securitySchemes: {
    BearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
  },
  defaultSecurityScheme: 'BearerAuth',
  persistAuthorization: true,
  snakeCase: true,
}
