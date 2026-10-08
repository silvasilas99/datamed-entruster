/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractResponse } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'auth.new_account.store': {
    methods: ["POST"]
    pattern: '/api/v1/auth/signup'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').signupValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').signupValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'auth.access_tokens.store': {
    methods: ["POST"]
    pattern: '/api/v1/auth/login'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').loginValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').loginValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'profile.profile.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/account/profile'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
    }
  }
  'profile.access_tokens.destroy': {
    methods: ["POST"]
    pattern: '/api/v1/account/logout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['destroy']>>>
    }
  }
  'metadata.store': {
    methods: ["POST"]
    pattern: '/api/v1/metadata'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/metadata_validator').createMetadataValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/metadata_validator').createMetadataValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/metadata_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/metadata_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'metadata.search': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/metadata/search'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/metadata_validator').searchMetadataValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/metadata_controller').default['search']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/metadata_controller').default['search']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'metadata.elastic_list': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/metadata/elastic-list'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/metadata_validator').searchMetadataValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/metadata_controller').default['elasticList']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/metadata_controller').default['elasticList']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'metadata.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/metadata'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/metadata_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/metadata_controller').default['index']>>>
    }
  }
  'metadata.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/metadata/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/metadata_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/metadata_controller').default['show']>>>
    }
  }
  'clinical_query.fetch_patient_metadata': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/clinical/metadata/:patientHash'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { patientHash: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/metadata_validator').searchMetadataValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/clinical_query_controller').default['fetchPatientMetadata']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/clinical_query_controller').default['fetchPatientMetadata']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'benchmark.health': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/benchmark/health'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/benchmark_controller').default['health']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/benchmark_controller').default['health']>>>
    }
  }
  'benchmark.compare_search': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/benchmark/compare-search'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/metadata_validator').searchMetadataValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/benchmark_controller').default['compareSearch']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/benchmark_controller').default['compareSearch']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'institutions.search': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/institutions/search'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/institution_validator').searchInstitutionValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/institutions_controller').default['search']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/institutions_controller').default['search']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'institutions.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/institutions'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/institutions_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/institutions_controller').default['index']>>>
    }
  }
  'institutions.store': {
    methods: ["POST"]
    pattern: '/api/v1/institutions'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/institution_validator').createInstitutionValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/institution_validator').createInstitutionValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/institutions_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/institutions_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'institutions.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/institutions/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/institutions_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/institutions_controller').default['show']>>>
    }
  }
  'institutions.update': {
    methods: ["PUT","PATCH"]
    pattern: '/api/v1/institutions/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/institution_validator').createInstitutionValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/institution_validator').createInstitutionValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/institutions_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/institutions_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'institutions.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/institutions/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/institutions_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/institutions_controller').default['destroy']>>>
    }
  }
  'patients.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/patients'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/patients_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/patients_controller').default['index']>>>
    }
  }
  'patients.store': {
    methods: ["POST"]
    pattern: '/api/v1/patients'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/patient_validator').createPatientValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/patient_validator').createPatientValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/patients_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/patients_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'patients.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/patients/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/patients_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/patients_controller').default['show']>>>
    }
  }
  'patients.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/patients/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/patients_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/patients_controller').default['destroy']>>>
    }
  }
  'patients.add_identifiers': {
    methods: ["POST"]
    pattern: '/api/v1/patients/:id/identifiers'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/patient_validator').addIdentifiersValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/patient_validator').addIdentifiersValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/patients_controller').default['addIdentifiers']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/patients_controller').default['addIdentifiers']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'patients.remove_identifier': {
    methods: ["DELETE"]
    pattern: '/api/v1/patients/:id/identifiers/:identifierId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; identifierId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/patients_controller').default['removeIdentifier']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/patients_controller').default['removeIdentifier']>>>
    }
  }
}
