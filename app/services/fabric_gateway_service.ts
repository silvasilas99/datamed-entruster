import { createPrivateKey } from 'node:crypto'
// @ts-ignore
import * as grpc from '@grpc/grpc-js'
// @ts-ignore
import { connect, hash, signers, type Gateway, type Network } from '@hyperledger/fabric-gateway'

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

  public async createFhirMetadata(metadataStr: string): Promise<void> {
    if (!this.network) throw new Error('Gateway não inicializado')

    const chaincodeName = process.env.FABRIC_CHAINCODE || 'fhirchaincode'
    const contract = this.network.getContract(chaincodeName)
    await contract.submitTransaction('CreateMetadata', metadataStr)
  }

  public async getAllFhirMetadata(): Promise<string> {
    if (!this.network) throw new Error('Gateway não inicializado')

    const contract = this.network.getContract('fhirchaincode')
    // Usamos evaluateTransaction para leitura pura
    const result = await contract.evaluateTransaction('GetAllMetadata')

    return new TextDecoder().decode(result)
  }

  public async getFhirMetadataById(id: string): Promise<string> {
    if (!this.network) throw new Error('Gateway não inicializado')

    const contract = this.network.getContract('fhirchaincode')

    // Passamos o nome da função no chaincode e o argumento (o ID)
    const result = await contract.evaluateTransaction('ReadMetadata', id)

    return new TextDecoder().decode(result)
  }
}
