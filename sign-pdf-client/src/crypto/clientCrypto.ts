import { EcdsaProvider } from './ecdsa/EcdsaProvider.ts'
import { createEcdsaP256Csr, type CsrSubject } from './ecdsa/csr.ts'
import { rawP256SignatureToDer } from './ecdsa/ecdsaSignature.ts'
import { MldsaProvider } from './mldsa/MldsaProvider.ts'
import { createMldsa65Csr } from './mldsa/csr.ts'
import { decryptPrivateKeyPem, encryptPkcs8Der } from './pkcs8Encryption.ts'
import { detectPkcs8Algorithm, detectPublicKeyAlgorithm, type ClientAlgorithm } from './keyFormats.ts'

function asArrayBuffer(data: Uint8Array): ArrayBuffer {
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
}

export interface BrowserGeneratedKeyPair {
  algorithm: ClientAlgorithm
  privateMaterial: CryptoKey | Uint8Array
  publicMaterial: CryptoKey | Uint8Array
  publicKeyPem: string
}

export async function generateBrowserKeyPair(algorithm: ClientAlgorithm): Promise<BrowserGeneratedKeyPair> {
  if (algorithm === 'ECDSA_P256') {
    const provider = new EcdsaProvider()
    const pair = await provider.generateKeyPair()
    return {
      algorithm,
      privateMaterial: pair.privateKey,
      publicMaterial: pair.publicKey,
      publicKeyPem: await provider.exportPublicKey(pair.publicKey),
    }
  }
  const provider = new MldsaProvider()
  const pair = provider.generateKeyPair()
  return {
    algorithm,
    privateMaterial: pair.seed,
    publicMaterial: pair.publicKey,
    publicKeyPem: provider.exportPublicKey(pair.publicKey),
  }
}

export async function exportEncryptedPrivateKey(pair: BrowserGeneratedKeyPair, password: string): Promise<string> {
  let pkcs8Der: Uint8Array
  if (pair.algorithm === 'ECDSA_P256') {
    const der = await crypto.subtle.exportKey('pkcs8', pair.privateMaterial as CryptoKey)
    pkcs8Der = new Uint8Array(der)
  } else {
    pkcs8Der = new MldsaProvider().exportPrivateKeyDer(pair.privateMaterial as Uint8Array)
  }
  try {
    return await encryptPkcs8Der(pkcs8Der, password)
  } finally {
    pkcs8Der.fill(0)
  }
}

export async function createCsrFromProtectedKeys(
  encryptedPrivatePem: string,
  password: string,
  publicKeyPem: string,
  subject: CsrSubject,
): Promise<{ csrPem: string; algorithm: ClientAlgorithm }> {
  const privateDer = await decryptPrivateKeyPem(encryptedPrivatePem, password)
  try {
    const privateAlgorithm = detectPkcs8Algorithm(privateDer)
    const publicAlgorithm = detectPublicKeyAlgorithm(publicKeyPem)
    if (privateAlgorithm !== publicAlgorithm) throw new Error('La llave privada y la llave pública usan algoritmos distintos.')

    if (privateAlgorithm === 'ECDSA_P256') {
      const provider = new EcdsaProvider()
      const privateKey = await crypto.subtle.importKey(
        'pkcs8',
        asArrayBuffer(privateDer),
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign'],
      )
      const publicKey = await provider.importPublicKey(publicKeyPem)
      return { csrPem: await createEcdsaP256Csr(privateKey, publicKey, subject), algorithm: privateAlgorithm }
    }

    const provider = new MldsaProvider()
    const seed = provider.importSeed(privateDer)
    const publicKey = provider.importPublicKey(publicKeyPem)
    try {
      return { csrPem: createMldsa65Csr(seed, publicKey, subject), algorithm: privateAlgorithm }
    } finally {
      seed.fill(0)
    }
  } finally {
    privateDer.fill(0)
  }
}

export async function signCmsAttributesLocally(
  encryptedPrivatePem: string,
  password: string,
  expectedAlgorithm: ClientAlgorithm,
  data: Uint8Array,
): Promise<Uint8Array> {
  const privateDer = await decryptPrivateKeyPem(encryptedPrivatePem, password)
  try {
    const actualAlgorithm = detectPkcs8Algorithm(privateDer)
    if (actualAlgorithm !== expectedAlgorithm) {
      throw new Error('La llave privada no corresponde al algoritmo del certificado seleccionado.')
    }

    if (actualAlgorithm === 'ECDSA_P256') {
      const key = await crypto.subtle.importKey(
        'pkcs8',
        asArrayBuffer(privateDer),
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign'],
      )
      const raw = new Uint8Array(
        await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, asArrayBuffer(data)),
      )
      return rawP256SignatureToDer(raw)
    }

    const provider = new MldsaProvider()
    const seed = provider.importSeed(privateDer)
    try {
      return provider.sign(data, seed)
    } finally {
      seed.fill(0)
    }
  } finally {
    privateDer.fill(0)
  }
}
