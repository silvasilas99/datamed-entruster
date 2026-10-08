import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'auth.new_account.store': { paramsTuple?: []; params?: {} }
    'auth.access_tokens.store': { paramsTuple?: []; params?: {} }
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'profile.access_tokens.destroy': { paramsTuple?: []; params?: {} }
    'metadata.store': { paramsTuple?: []; params?: {} }
    'metadata.search': { paramsTuple?: []; params?: {} }
    'metadata.elastic_list': { paramsTuple?: []; params?: {} }
    'metadata.index': { paramsTuple?: []; params?: {} }
    'metadata.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'clinical_query.fetch_patient_metadata': { paramsTuple: [ParamValue]; params: {'patientHash': ParamValue} }
    'benchmark.health': { paramsTuple?: []; params?: {} }
    'benchmark.compare_search': { paramsTuple?: []; params?: {} }
    'institutions.search': { paramsTuple?: []; params?: {} }
    'institutions.index': { paramsTuple?: []; params?: {} }
    'institutions.store': { paramsTuple?: []; params?: {} }
    'institutions.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'institutions.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'institutions.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'patients.index': { paramsTuple?: []; params?: {} }
    'patients.store': { paramsTuple?: []; params?: {} }
    'patients.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'patients.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'patients.add_identifiers': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'patients.remove_identifier': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'identifierId': ParamValue} }
  }
  GET: {
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'metadata.search': { paramsTuple?: []; params?: {} }
    'metadata.elastic_list': { paramsTuple?: []; params?: {} }
    'metadata.index': { paramsTuple?: []; params?: {} }
    'metadata.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'clinical_query.fetch_patient_metadata': { paramsTuple: [ParamValue]; params: {'patientHash': ParamValue} }
    'benchmark.health': { paramsTuple?: []; params?: {} }
    'benchmark.compare_search': { paramsTuple?: []; params?: {} }
    'institutions.search': { paramsTuple?: []; params?: {} }
    'institutions.index': { paramsTuple?: []; params?: {} }
    'institutions.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'patients.index': { paramsTuple?: []; params?: {} }
    'patients.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  HEAD: {
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'metadata.search': { paramsTuple?: []; params?: {} }
    'metadata.elastic_list': { paramsTuple?: []; params?: {} }
    'metadata.index': { paramsTuple?: []; params?: {} }
    'metadata.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'clinical_query.fetch_patient_metadata': { paramsTuple: [ParamValue]; params: {'patientHash': ParamValue} }
    'benchmark.health': { paramsTuple?: []; params?: {} }
    'benchmark.compare_search': { paramsTuple?: []; params?: {} }
    'institutions.search': { paramsTuple?: []; params?: {} }
    'institutions.index': { paramsTuple?: []; params?: {} }
    'institutions.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'patients.index': { paramsTuple?: []; params?: {} }
    'patients.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  POST: {
    'auth.new_account.store': { paramsTuple?: []; params?: {} }
    'auth.access_tokens.store': { paramsTuple?: []; params?: {} }
    'profile.access_tokens.destroy': { paramsTuple?: []; params?: {} }
    'metadata.store': { paramsTuple?: []; params?: {} }
    'institutions.store': { paramsTuple?: []; params?: {} }
    'patients.store': { paramsTuple?: []; params?: {} }
    'patients.add_identifiers': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PUT: {
    'institutions.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PATCH: {
    'institutions.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  DELETE: {
    'institutions.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'patients.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'patients.remove_identifier': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'identifierId': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}