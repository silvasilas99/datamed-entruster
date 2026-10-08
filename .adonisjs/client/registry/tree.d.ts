/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  auth: {
    newAccount: {
      store: typeof routes['auth.new_account.store']
    }
    accessTokens: {
      store: typeof routes['auth.access_tokens.store']
    }
  }
  profile: {
    profile: {
      show: typeof routes['profile.profile.show']
    }
    accessTokens: {
      destroy: typeof routes['profile.access_tokens.destroy']
    }
  }
  metadata: {
    store: typeof routes['metadata.store']
    search: typeof routes['metadata.search']
    elasticList: typeof routes['metadata.elastic_list']
    index: typeof routes['metadata.index']
    show: typeof routes['metadata.show']
  }
  clinicalQuery: {
    fetchPatientMetadata: typeof routes['clinical_query.fetch_patient_metadata']
  }
  benchmark: {
    health: typeof routes['benchmark.health']
    compareSearch: typeof routes['benchmark.compare_search']
  }
  institutions: {
    search: typeof routes['institutions.search']
    index: typeof routes['institutions.index']
    store: typeof routes['institutions.store']
    show: typeof routes['institutions.show']
    update: typeof routes['institutions.update']
    destroy: typeof routes['institutions.destroy']
  }
  patients: {
    index: typeof routes['patients.index']
    store: typeof routes['patients.store']
    show: typeof routes['patients.show']
    destroy: typeof routes['patients.destroy']
    addIdentifiers: typeof routes['patients.add_identifiers']
    removeIdentifier: typeof routes['patients.remove_identifier']
  }
}
