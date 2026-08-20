export type SignatureAlgorithm = 'ECDSA_P256' | 'ML_DSA_65'

export interface SignatureProvider {
  generateKeyPair(): Promise<CryptoKeyPair>
  exportPrivateKey(privateKey: CryptoKey): Promise<string>
  exportPublicKey(publicKey: CryptoKey): Promise<string>
  importPrivateKey(pem: string): Promise<CryptoKey>
  importPublicKey(pem: string): Promise<CryptoKey>
  sign(data: BufferSource, privateKey: CryptoKey): Promise<Uint8Array>
  verify(data: BufferSource, signature: BufferSource, publicKey: CryptoKey): Promise<boolean>
}
