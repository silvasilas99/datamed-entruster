import { createPrivateKey } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
// @ts-ignore
import * as grpc from '@grpc/grpc-js'
// @ts-ignore
import { connect, hash, signers, type Gateway, type Network } from '@hyperledger/fabric-gateway'

import {
  CreateConsentInputDto,
  RevokeConsentInputDto,
  ConsentOutputDto,
} from '#dtos/consent_dto'
import {
  RecordInteropEventInputDto,
  RecordInteropEventResultDto,
  InteropEventOutputDto,
} from '#dtos/interop_event_dto'
import {
  EvaluateAccessInputDto,
  CheckAccessInputDto,
  AccessDecisionOutputDto,
  AccessEvaluationOutputDto,
} from '#dtos/access_decision_dto'
import {
  CreateFhirMetadataInputDto,
  FhirMetadataOutputDto,
} from '#dtos/fhir_metadata_dto'

type MicrofabComponent = {
  id: string
  type: string
  msp_id?: string
  cert?: string
  private_key?: string
  api_url?: string
  api_options?: Record<string, string | number>
}

export default class FabricGatewayService {
  private static instance: FabricGatewayService
  private gateway?: Gateway
  private network?: Network
  private client?: grpc.Client

  private constructor() {}

  public static getInstance(): FabricGatewayService {
    if (!FabricGatewayService.instance) {
      FabricGatewayService.instance = new FabricGatewayService()
    }
    return FabricGatewayService.instance
  }

  public async initialize(): Promise<void> {
    if (this.gateway) return

    const mode = process.env.FABRIC_MODE || 'test-network'
    if (mode === 'microfab') {
      await this.initializeMicrofab()
    } else {
      await this.initializeTestNetwork()
    }
  }

  private async initializeTestNetwork(): Promise<void> {
    const channelName = process.env.FABRIC_CHANNEL || 'mychannel'
    const mspId = process.env.FABRIC_MSP_ID || 'Org1MSP'
    const peerEndpoint = process.env.FABRIC_ENDPOINT || 'localhost:7051'
    const peerHostOverride =
      process.env.FABRIC_PEER_HOST_OVERRIDE || 'peer0.org1.example.com'
    const cryptoPath =
      process.env.FABRIC_CRYPTO_PATH ||
      join(process.cwd(), 'fabric-samples/test-network/organizations')

    const orgPeerTlsPath = join(
      cryptoPath,
      'peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls'
    )
    const orgUserMspPath = join(
      cryptoPath,
      'peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp'
    )

    const tlsRootCert = readFileSync(join(orgPeerTlsPath, 'ca.crt'))
    const credentials = readFileSync(
      join(orgUserMspPath, 'signcerts', this.firstFile(join(orgUserMspPath, 'signcerts')))
    )
    const privateKeyPem = readFileSync(
      join(orgUserMspPath, 'keystore', this.firstFile(join(orgUserMspPath, 'keystore')))
    )
    const privateKey = createPrivateKey(privateKeyPem)
    const signer = signers.newPrivateKeySigner(privateKey)

    this.client = new grpc.Client(peerEndpoint, grpc.credentials.createSsl(tlsRootCert), {
      'grpc.ssl_target_name_override': peerHostOverride,
      'grpc.default_authority': peerHostOverride,
    })

    this.gateway = connect({
      client: this.client,
      identity: {
        mspId,
        credentials,
      },
      signer,
      hash: hash.sha256,
    })

    this.network = this.gateway.getNetwork(channelName)
  }

  private async initializeMicrofab(): Promise<void> {
    const microfabUrl = process.env.MICROFAB_URL || 'http://fabric:8080'
    const fabricEndpoint = process.env.FABRIC_ENDPOINT || 'fabric:8080'
    const channelName = process.env.FABRIC_CHANNEL || 'fhirchannel'

    const components = (await fetch(`${microfabUrl}/ak/api/v1/components`).then((r) =>
      r.json()
    )) as MicrofabComponent[]

    const identity = components.find((c) => c.id === 'org1admin')
    const peer = components.find((c) => c.id === 'org1peer')

    if (!identity?.cert || !identity.private_key || !identity.msp_id) {
      throw new Error('Microfab Org1 Admin identity not found')
    }

    if (!peer) {
      throw new Error('Microfab Org1 Peer not found')
    }

    const credentials = Buffer.from(identity.cert, 'base64')
    const privateKeyPem = Buffer.from(identity.private_key, 'base64').toString('utf8')
    const privateKey = createPrivateKey(privateKeyPem)
    const signer = signers.newPrivateKeySigner(privateKey)

    const authority = String(
      peer.api_options?.['grpc.default_authority'] || 'org1peer-api.127-0-0-1.nip.io:8080'
    )
    const sslTargetNameOverride = String(
      peer.api_options?.['grpc.ssl_target_name_override'] || 'org1peer-api.127-0-0-1.nip.io'
    )

    this.client = new grpc.Client(fabricEndpoint, grpc.credentials.createInsecure(), {
      'grpc.default_authority': authority,
      'grpc.ssl_target_name_override': sslTargetNameOverride,
    })

    this.gateway = connect({
      client: this.client,
      identity: {
        mspId: identity.msp_id,
        credentials,
      },
      signer,
      hash: hash.sha256,
    })

    this.network = this.gateway.getNetwork(channelName)
  }

  private firstFile(dir: string): string {
    const files = readdirSync(dir).filter((name) => !name.startsWith('.'))
    if (files.length === 0) {
      throw new Error(`Nenhum arquivo encontrado em ${dir}`)
    }
    return files[0]
  }

  private getContract(contractName?: string) {
    if (!this.network) throw new Error('Gateway não inicializado')
    const chaincodeName = process.env.FABRIC_CHAINCODE || 'fhir_chaincode'
    return contractName
      ? this.network.getContract(chaincodeName, contractName)
      : this.network.getContract(chaincodeName)
  }

  private decode(result: Uint8Array): string {
    return new TextDecoder().decode(result)
  }

  // ---------------------------------------------------------
  // FHIR Metadata Operations (FhirChaincode)
  // ---------------------------------------------------------

  /**
   * Persiste metadados FHIR na blockchain.
   * @param dto - DTO de entrada com campos tipados
   */
  public async createFhirMetadata(dto: CreateFhirMetadataInputDto): Promise<void> {
    const contract = this.getContract('FhirChaincode')
    await contract.submitTransaction('CreateMetadata', JSON.stringify(dto))
  }

  /**
   * Lista todos os metadados FHIR registrados.
   * @returns Array tipado de FhirMetadataOutputDto
   */
  public async getAllFhirMetadata(): Promise<FhirMetadataOutputDto[]> {
    const contract = this.getContract('FhirChaincode')
    const result = await contract.evaluateTransaction('GetAllMetadata')
    return JSON.parse(this.decode(result)) as FhirMetadataOutputDto[]
  }

  /**
   * Busca um metadado FHIR pelo ID.
   * @returns FhirMetadataOutputDto tipado
   */
  public async getFhirMetadataById(id: string): Promise<FhirMetadataOutputDto> {
    const contract = this.getContract('FhirChaincode')
    const result = await contract.evaluateTransaction('ReadMetadata', id)
    return JSON.parse(this.decode(result)) as FhirMetadataOutputDto
  }

  // ---------------------------------------------------------
  // Health Interoperability Events (HealthInteropContract)
  // ---------------------------------------------------------

  /**
   * Cria um registro de consentimento na blockchain.
   * @param dto - DTO com scope como array (convertido para JSON internamente)
   * @returns ConsentOutputDto tipado
   */
  public async createConsentRecord(dto: CreateConsentInputDto): Promise<ConsentOutputDto> {
    const contract = this.getContract('HealthInteropContract')
    const payload = {
      consentId: dto.consentId,
      patientId: dto.patientId,
      dataControllerId: dto.dataControllerId,
      scopeJson: JSON.stringify(dto.scope),
      purpose: dto.purpose,
      payloadHash: dto.payloadHash,
      grantedAt: dto.grantedAt,
      expiresAt: dto.expiresAt ?? '',
    }
    const result = await contract.submitTransaction('CreateConsentRecord', JSON.stringify(payload))
    return JSON.parse(this.decode(result)) as ConsentOutputDto
  }

  /**
   * Revoga um registro de consentimento.
   * @param dto - DTO com consentId e reason
   * @returns ConsentOutputDto atualizado
   */
  public async revokeConsent(dto: RevokeConsentInputDto): Promise<ConsentOutputDto> {
    const contract = this.getContract('HealthInteropContract')
    const result = await contract.submitTransaction('RevokeConsent', JSON.stringify(dto))
    return JSON.parse(this.decode(result)) as ConsentOutputDto
  }

  /**
   * Busca um registro de consentimento pelo ID.
   */
  public async getConsent(consentId: string): Promise<ConsentOutputDto> {
    const contract = this.getContract('HealthInteropContract')
    const result = await contract.evaluateTransaction('GetConsent', consentId)
    return JSON.parse(this.decode(result)) as ConsentOutputDto
  }

  /**
   * Lista todos os consentimentos de um paciente.
   */
  public async queryConsentsByPatient(patientId: string): Promise<ConsentOutputDto[]> {
    const contract = this.getContract('HealthInteropContract')
    const result = await contract.evaluateTransaction('QueryConsentsByPatient', patientId)
    return JSON.parse(this.decode(result)) as ConsentOutputDto[]
  }

  /**
   * Avalia (sem gravar) se o acesso é permitido pelo consent.
   * @returns AccessEvaluationOutputDto com allowed e reason
   */
  public async evaluateAccess(dto: EvaluateAccessInputDto): Promise<AccessEvaluationOutputDto> {
    const contract = this.getContract('HealthInteropContract')
    const payload = {
      patientId: dto.patientId,
      resourceType: dto.resourceType,
      consentId: dto.consentId ?? '',
    }
    const result = await contract.evaluateTransaction('EvaluateAccess', JSON.stringify(payload))
    return JSON.parse(this.decode(result)) as AccessEvaluationOutputDto
  }

  /**
   * Avalia e registra uma decisão de acesso (audit trail imutável).
   * @returns AccessDecisionOutputDto com a decisão gravada
   */
  public async checkAccess(dto: CheckAccessInputDto): Promise<AccessDecisionOutputDto> {
    const contract = this.getContract('HealthInteropContract')
    const payload = {
      decisionId: dto.decisionId,
      patientId: dto.patientId,
      resourceType: dto.resourceType,
      consentId: dto.consentId ?? '',
    }
    const result = await contract.submitTransaction('CheckAccess', JSON.stringify(payload))
    return JSON.parse(this.decode(result)) as AccessDecisionOutputDto
  }

  /**
   * Registra um evento de interoperabilidade clínica após verificar o consent.
   * @returns RecordInteropEventResultDto com recorded=true/false e o evento se gravado
   */
  public async recordInteropEvent(
    dto: RecordInteropEventInputDto
  ): Promise<RecordInteropEventResultDto> {
    const contract = this.getContract('HealthInteropContract')
    const payload = {
      eventId: dto.eventId,
      patientId: dto.patientId,
      sourceSystem: dto.sourceSystem,
      targetSystem: dto.targetSystem,
      resourceType: dto.resourceType,
      resourceHash: dto.resourceHash,
      direction: dto.direction,
      consentId: dto.consentId ?? '',
    }
    const result = await contract.submitTransaction('RecordInteropEvent', JSON.stringify(payload))
    return JSON.parse(this.decode(result)) as RecordInteropEventResultDto
  }

  /**
   * Busca um evento de interoperabilidade pelo ID.
   */
  public async getInteropEvent(eventId: string): Promise<InteropEventOutputDto> {
    const contract = this.getContract('HealthInteropContract')
    const result = await contract.evaluateTransaction('GetInteropEvent', eventId)
    return JSON.parse(this.decode(result)) as InteropEventOutputDto
  }

  /**
   * Lista todos os eventos de interoperabilidade de um paciente.
   */
  public async queryEventsByPatient(patientId: string): Promise<InteropEventOutputDto[]> {
    const contract = this.getContract('HealthInteropContract')
    const result = await contract.evaluateTransaction('QueryEventsByPatient', patientId)
    return JSON.parse(this.decode(result)) as InteropEventOutputDto[]
  }
}
