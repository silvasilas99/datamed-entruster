/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
  'auth.new_account.store': {
    methods: ["POST"],
    pattern: '/api/v1/auth/signup',
    tokens: [{"old":"/api/v1/auth/signup","type":0,"val":"api","end":""},{"old":"/api/v1/auth/signup","type":0,"val":"v1","end":""},{"old":"/api/v1/auth/signup","type":0,"val":"auth","end":""},{"old":"/api/v1/auth/signup","type":0,"val":"signup","end":""}],
    types: placeholder as Registry['auth.new_account.store']['types'],
  },
  'auth.access_tokens.store': {
    methods: ["POST"],
    pattern: '/api/v1/auth/login',
    tokens: [{"old":"/api/v1/auth/login","type":0,"val":"api","end":""},{"old":"/api/v1/auth/login","type":0,"val":"v1","end":""},{"old":"/api/v1/auth/login","type":0,"val":"auth","end":""},{"old":"/api/v1/auth/login","type":0,"val":"login","end":""}],
    types: placeholder as Registry['auth.access_tokens.store']['types'],
  },
  'profile.profile.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/account/profile',
    tokens: [{"old":"/api/v1/account/profile","type":0,"val":"api","end":""},{"old":"/api/v1/account/profile","type":0,"val":"v1","end":""},{"old":"/api/v1/account/profile","type":0,"val":"account","end":""},{"old":"/api/v1/account/profile","type":0,"val":"profile","end":""}],
    types: placeholder as Registry['profile.profile.show']['types'],
  },
  'profile.access_tokens.destroy': {
    methods: ["POST"],
    pattern: '/api/v1/account/logout',
    tokens: [{"old":"/api/v1/account/logout","type":0,"val":"api","end":""},{"old":"/api/v1/account/logout","type":0,"val":"v1","end":""},{"old":"/api/v1/account/logout","type":0,"val":"account","end":""},{"old":"/api/v1/account/logout","type":0,"val":"logout","end":""}],
    types: placeholder as Registry['profile.access_tokens.destroy']['types'],
  },
  'metadata.store': {
    methods: ["POST"],
    pattern: '/api/v1/metadata',
    tokens: [{"old":"/api/v1/metadata","type":0,"val":"api","end":""},{"old":"/api/v1/metadata","type":0,"val":"v1","end":""},{"old":"/api/v1/metadata","type":0,"val":"metadata","end":""}],
    types: placeholder as Registry['metadata.store']['types'],
  },
  'metadata.search': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/metadata/search',
    tokens: [{"old":"/api/v1/metadata/search","type":0,"val":"api","end":""},{"old":"/api/v1/metadata/search","type":0,"val":"v1","end":""},{"old":"/api/v1/metadata/search","type":0,"val":"metadata","end":""},{"old":"/api/v1/metadata/search","type":0,"val":"search","end":""}],
    types: placeholder as Registry['metadata.search']['types'],
  },
  'metadata.elastic_list': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/metadata/elastic-list',
    tokens: [{"old":"/api/v1/metadata/elastic-list","type":0,"val":"api","end":""},{"old":"/api/v1/metadata/elastic-list","type":0,"val":"v1","end":""},{"old":"/api/v1/metadata/elastic-list","type":0,"val":"metadata","end":""},{"old":"/api/v1/metadata/elastic-list","type":0,"val":"elastic-list","end":""}],
    types: placeholder as Registry['metadata.elastic_list']['types'],
  },
  'metadata.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/metadata',
    tokens: [{"old":"/api/v1/metadata","type":0,"val":"api","end":""},{"old":"/api/v1/metadata","type":0,"val":"v1","end":""},{"old":"/api/v1/metadata","type":0,"val":"metadata","end":""}],
    types: placeholder as Registry['metadata.index']['types'],
  },
  'metadata.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/metadata/:id',
    tokens: [{"old":"/api/v1/metadata/:id","type":0,"val":"api","end":""},{"old":"/api/v1/metadata/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/metadata/:id","type":0,"val":"metadata","end":""},{"old":"/api/v1/metadata/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['metadata.show']['types'],
  },
  'clinical_query.fetch_patient_metadata': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/clinical/metadata/:patientHash',
    tokens: [{"old":"/api/v1/clinical/metadata/:patientHash","type":0,"val":"api","end":""},{"old":"/api/v1/clinical/metadata/:patientHash","type":0,"val":"v1","end":""},{"old":"/api/v1/clinical/metadata/:patientHash","type":0,"val":"clinical","end":""},{"old":"/api/v1/clinical/metadata/:patientHash","type":0,"val":"metadata","end":""},{"old":"/api/v1/clinical/metadata/:patientHash","type":1,"val":"patientHash","end":""}],
    types: placeholder as Registry['clinical_query.fetch_patient_metadata']['types'],
  },
  'benchmark.health': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/benchmark/health',
    tokens: [{"old":"/api/v1/benchmark/health","type":0,"val":"api","end":""},{"old":"/api/v1/benchmark/health","type":0,"val":"v1","end":""},{"old":"/api/v1/benchmark/health","type":0,"val":"benchmark","end":""},{"old":"/api/v1/benchmark/health","type":0,"val":"health","end":""}],
    types: placeholder as Registry['benchmark.health']['types'],
  },
  'benchmark.compare_search': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/benchmark/compare-search',
    tokens: [{"old":"/api/v1/benchmark/compare-search","type":0,"val":"api","end":""},{"old":"/api/v1/benchmark/compare-search","type":0,"val":"v1","end":""},{"old":"/api/v1/benchmark/compare-search","type":0,"val":"benchmark","end":""},{"old":"/api/v1/benchmark/compare-search","type":0,"val":"compare-search","end":""}],
    types: placeholder as Registry['benchmark.compare_search']['types'],
  },
  'institutions.search': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/institutions/search',
    tokens: [{"old":"/api/v1/institutions/search","type":0,"val":"api","end":""},{"old":"/api/v1/institutions/search","type":0,"val":"v1","end":""},{"old":"/api/v1/institutions/search","type":0,"val":"institutions","end":""},{"old":"/api/v1/institutions/search","type":0,"val":"search","end":""}],
    types: placeholder as Registry['institutions.search']['types'],
  },
  'institutions.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/institutions',
    tokens: [{"old":"/api/v1/institutions","type":0,"val":"api","end":""},{"old":"/api/v1/institutions","type":0,"val":"v1","end":""},{"old":"/api/v1/institutions","type":0,"val":"institutions","end":""}],
    types: placeholder as Registry['institutions.index']['types'],
  },
  'institutions.store': {
    methods: ["POST"],
    pattern: '/api/v1/institutions',
    tokens: [{"old":"/api/v1/institutions","type":0,"val":"api","end":""},{"old":"/api/v1/institutions","type":0,"val":"v1","end":""},{"old":"/api/v1/institutions","type":0,"val":"institutions","end":""}],
    types: placeholder as Registry['institutions.store']['types'],
  },
  'institutions.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/institutions/:id',
    tokens: [{"old":"/api/v1/institutions/:id","type":0,"val":"api","end":""},{"old":"/api/v1/institutions/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/institutions/:id","type":0,"val":"institutions","end":""},{"old":"/api/v1/institutions/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['institutions.show']['types'],
  },
  'institutions.update': {
    methods: ["PUT","PATCH"],
    pattern: '/api/v1/institutions/:id',
    tokens: [{"old":"/api/v1/institutions/:id","type":0,"val":"api","end":""},{"old":"/api/v1/institutions/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/institutions/:id","type":0,"val":"institutions","end":""},{"old":"/api/v1/institutions/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['institutions.update']['types'],
  },
  'institutions.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/institutions/:id',
    tokens: [{"old":"/api/v1/institutions/:id","type":0,"val":"api","end":""},{"old":"/api/v1/institutions/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/institutions/:id","type":0,"val":"institutions","end":""},{"old":"/api/v1/institutions/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['institutions.destroy']['types'],
  },
  'patients.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/patients',
    tokens: [{"old":"/api/v1/patients","type":0,"val":"api","end":""},{"old":"/api/v1/patients","type":0,"val":"v1","end":""},{"old":"/api/v1/patients","type":0,"val":"patients","end":""}],
    types: placeholder as Registry['patients.index']['types'],
  },
  'patients.store': {
    methods: ["POST"],
    pattern: '/api/v1/patients',
    tokens: [{"old":"/api/v1/patients","type":0,"val":"api","end":""},{"old":"/api/v1/patients","type":0,"val":"v1","end":""},{"old":"/api/v1/patients","type":0,"val":"patients","end":""}],
    types: placeholder as Registry['patients.store']['types'],
  },
  'patients.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/patients/:id',
    tokens: [{"old":"/api/v1/patients/:id","type":0,"val":"api","end":""},{"old":"/api/v1/patients/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/patients/:id","type":0,"val":"patients","end":""},{"old":"/api/v1/patients/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['patients.show']['types'],
  },
  'patients.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/patients/:id',
    tokens: [{"old":"/api/v1/patients/:id","type":0,"val":"api","end":""},{"old":"/api/v1/patients/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/patients/:id","type":0,"val":"patients","end":""},{"old":"/api/v1/patients/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['patients.destroy']['types'],
  },
  'patients.add_identifiers': {
    methods: ["POST"],
    pattern: '/api/v1/patients/:id/identifiers',
    tokens: [{"old":"/api/v1/patients/:id/identifiers","type":0,"val":"api","end":""},{"old":"/api/v1/patients/:id/identifiers","type":0,"val":"v1","end":""},{"old":"/api/v1/patients/:id/identifiers","type":0,"val":"patients","end":""},{"old":"/api/v1/patients/:id/identifiers","type":1,"val":"id","end":""},{"old":"/api/v1/patients/:id/identifiers","type":0,"val":"identifiers","end":""}],
    types: placeholder as Registry['patients.add_identifiers']['types'],
  },
  'patients.remove_identifier': {
    methods: ["DELETE"],
    pattern: '/api/v1/patients/:id/identifiers/:identifierId',
    tokens: [{"old":"/api/v1/patients/:id/identifiers/:identifierId","type":0,"val":"api","end":""},{"old":"/api/v1/patients/:id/identifiers/:identifierId","type":0,"val":"v1","end":""},{"old":"/api/v1/patients/:id/identifiers/:identifierId","type":0,"val":"patients","end":""},{"old":"/api/v1/patients/:id/identifiers/:identifierId","type":1,"val":"id","end":""},{"old":"/api/v1/patients/:id/identifiers/:identifierId","type":0,"val":"identifiers","end":""},{"old":"/api/v1/patients/:id/identifiers/:identifierId","type":1,"val":"identifierId","end":""}],
    types: placeholder as Registry['patients.remove_identifier']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
