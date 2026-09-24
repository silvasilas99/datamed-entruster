import emitter from '@adonisjs/core/services/emitter'

// Events
import FhirMetadataSaved from '#events/healthcare/fhir_metadata_saved'
import FhirMetadataDeleted from '#events/healthcare/fhir_metadata_deleted'

// Listeners
import FhirMetadataIndexer from '#listeners/healthcare/fhir_metadata_indexer'

/*
|--------------------------------------------------------------------------
| Event listeners
|--------------------------------------------------------------------------
|
| Registra os listeners para os eventos da aplicação. Cada evento pode ter
| múltiplos listeners, executados em sequência.
|
*/

emitter.on(FhirMetadataSaved, [FhirMetadataIndexer, 'handleSaved'])
emitter.on(FhirMetadataDeleted, [FhirMetadataIndexer, 'handleDeleted'])
