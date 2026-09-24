# Setup de rede blockchain

Compila chaincode`

```bash
cd chaincode
npm install
npm run build
cd ..
```

Clona repositório e instala binários do Fabric

```bash
git clone https://github.com/hyperledger/fabric-samples.git
cd fabric-samples
curl -sSL https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh | bash -s -- binary docker
cd ..
```

Inicializa rede e cria canal "mychannel"

```bash
cd fabric-samples/test-network
./network.sh up
./network.sh createChannel
cd ../..
```

Define váriaveis de ambiente principais e empacota chaincode em .tar.gz

```bash
cd fabric-samples/test-network
export PATH=$PATH:/mnt/d/@PROJETOS/Mestrado/Interopchain/datamed_entruster/fabric-samples/bin
export FABRIC_CFG_PATH=$PWD/../config/
export CORE_PEER_TLS_ENABLED=true
peer lifecycle chaincode package fhir_chaincode.tar.gz \
  --path /mnt/d/@PROJETOS/Mestrado/Interopchain/datamed_entruster/chaincode/ \
  --lang node \
  --label fhir_chaincode_1.0
cd ../..
```

Define variaveis de ambiente da Org1

```bash
cd fabric-samples/test-network
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=$PWD/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=$PWD/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051
cd ../..
```

Envia CC compilado para peer e gera package_id na Org1

```bash
cd fabric-samples/test-network
peer lifecycle chaincode install fhir_chaincode.tar.gz
cd ../..
```

Aprova o chaincode para o canal de rede da Org1

```bash
cd fabric-samples/test-network
export CC_PACKAGE_ID=fhir_chaincode_1.0:174f63f922b8f6f0eb0f68bcca36edc16f4479cacd36c469d7de506cf74e6580
export ORDERER_CA=$PWD/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
peer lifecycle chaincode approveformyorg -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls --cafile $ORDERER_CA \
  --channelID mychannel \
  --name fhir_chaincode \
  --version 1.0 \
  --package-id $CC_PACKAGE_ID \
  --sequence 3
cd ../..
```

Define variaveis para a Org2

```bash
cd fabric-samples/test-network
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=$PWD/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=$PWD/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_ADDRESS=localhost:9051
cd ..
 ```

Envia CC compilado para peer e gera package_id na Org2

```bash
cd fabric-samples/test-network
peer lifecycle chaincode install fhir_chaincode.tar.gz
cd ../..
```

Aprova o chaincode para o canal de rede da Org1

```bash
cd fabric-samples/test-network
export CC_PACKAGE_ID=fhir_chaincode_1.0:2d28e8c1dedf610399993c1e8659c88abbad186be67b72d6b12ed6294d07fc2c
export ORDERER_CA=$PWD/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
peer lifecycle chaincode approveformyorg -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls --cafile $ORDERER_CA \
  --channelID mychannel \
  --name fhir_chaincode \
  --version 1.0 \
  --package-id $CC_PACKAGE_ID \
  --sequence 3
cd ../..
```

Verifica se é possivel commitar CC no canal

```bash
cd fabric-samples/test-network
peer lifecycle chaincode checkcommitreadiness \
  --channelID mychannel \
  --name fhir_chaincode \
  --version 1.0 \
  --sequence 3 \
  --output json
cd ../..
```

Commita CC para os peers do canal

```bash
cd fabric-samples/test-network
peer lifecycle chaincode commit -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls --cafile $ORDERER_CA \
  --channelID mychannel \
  --name fhir_chaincode \
  --version 1.0 \
  --sequence 3 \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles $PWD/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
  --peerAddresses localhost:9051 \
  --tlsRootCertFiles $PWD/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
cd ../..
```

Realiza transação para criação de metadados

```bash
peer chaincode invoke -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --channelID mychannel \
  --name fhir_chaincode \
  --tls \
  --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
  --peerAddresses localhost:9051 \
  --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt \
  -c '{"Args":["CreateMetadata", "{\"resourceId\":\"patient-01\", \"resourceType\":\"Patient\", \"status\":\"active\"}"]}'
```

Realiza transação para listar metadados

```bash
peer chaincode query \
  -C mychannel \
  -n fhir_chaincode \
  -c '{"Args":["GetAllMetadata"]}'
```
