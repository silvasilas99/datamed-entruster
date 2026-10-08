import emitter from '@adonisjs/core/services/emitter'

// Events
import FhirMetadataSaved from '#events/fhir_metadata_saved'
import FhirMetadataDeleted from '#events/fhir_metadata_deleted'
import ClinicalAccessEvent from '#events/clinical_access_event'

// Listeners
const FhirMetadataIndexer = () => import('#listeners/fhir_metadata_indexer')
const ClinicalAuditLogger = () => import('#listeners/clinical_audit_logger')

/*
|--------------------------------------------------------------------------
| Event listeners
|--------------------------------------------------------------------------
|
| Registra os listeners para os eventos da aplicação. Cada evento pode ter
| múltiplos listeners, executados em sequência.
|
*/

// Metadados FHIR
emitter.on(FhirMetadataSaved, [FhirMetadataIndexer, 'handleSaved'])
emitter.on(FhirMetadataDeleted, [FhirMetadataIndexer, 'handleDeleted'])

// Auditoria Clínica e Interoperabilidade (Blockchain Fabric)
emitter.on(ClinicalAccessEvent, [ClinicalAuditLogger, 'handle'])
