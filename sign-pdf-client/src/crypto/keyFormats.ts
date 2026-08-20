import { derToPem, pemToDer } from './encoding.ts'
import { derChildren, derContent, decodeDerOid, readDerNode } from './asn1.ts'
import {
  derBitString,
  derContext0Primitive,
  derIntegerNumber,
  derOctetString,
  derOid,
  derSequence,
} from './ecdsa/der.ts'

export type ClientAlgorithm = 'ECDSA_P256' | 'ML_DSA_65'

export const OID_EC_PUBLIC_KEY = '1.2.840.10045.2.1'
export const OID_ML_DSA_65 = '2.16.840.1.101.3.4.3.18'

function algorithmOidFromPkcs8(pkcs8Der: Uint8Array): string {
  const root = readDerNode(pkcs8Der)
  if (root.tag !== 0x30 || root.next !== pkcs8Der.length) throw new Error('PKCS#8 inválido.')
  const children = derChildren(pkcs8Der, root)
  if (children.length < 3 || children[1].tag !== 0x30) throw new Error('PKCS#8 inválido.')
  const algChildren = derChildren(pkcs8Der, children[1])
  if (!algChildren.length) throw new Error('PKCS#8 sin algoritmo.')
  return decodeDerOid(pkcs8Der, algChildren[0])
}

function algorithmOidFromSpki(spkiDer: Uint8Array): string {
  const root = readDerNode(spkiDer)
  if (root.tag !== 0x30 || root.next !== spkiDer.length) throw new Error('SPKI inválido.')
  const children = derChildren(spkiDer, root)
  if (children.length !== 2 || children[0].tag !== 0x30) throw new Error('SPKI inválido.')
  const algChildren = derChildren(spkiDer, children[0])
  if (!algChildren.length) throw new Error('SPKI sin algoritmo.')
  return decodeDerOid(spkiDer, algChildren[0])
}

export function detectPkcs8Algorithm(pkcs8Der: Uint8Array): ClientAlgorithm {
  const oid = algorithmOidFromPkcs8(pkcs8Der)
  if (oid === OID_EC_PUBLIC_KEY) return 'ECDSA_P256'
  if (oid === OID_ML_DSA_65) return 'ML_DSA_65'
  throw new Error(`Algoritmo de llave privada no soportado: ${oid}`)
}

export function detectPublicKeyAlgorithm(publicKeyPem: string): ClientAlgorithm {
  const der = pemToDer(publicKeyPem, 'PUBLIC KEY')
  const oid = algorithmOidFromSpki(der)
  if (oid === OID_EC_PUBLIC_KEY) return 'ECDSA_P256'
  if (oid === OID_ML_DSA_65) return 'ML_DSA_65'
  throw new Error(`Algoritmo de llave pública no soportado: ${oid}`)
}

export function buildMldsa65Pkcs8(seed: Uint8Array): Uint8Array {
  if (seed.length !== 32) throw new Error('El seed ML-DSA-65 debe tener 32 bytes.')
  // RFC 9881, seed format: PrivateKeyInfo.privateKey OCTET STRING contiene
  // ML-DSA-65-PrivateKey ::= seed [0] OCTET STRING (SIZE(32)).
  return derSequence(
    derIntegerNumber(0),
    derSequence(derOid(OID_ML_DSA_65)),
    derOctetString(derContext0Primitive(seed)),
  )
}

export function buildMldsa65PrivateKeyPem(seed: Uint8Array): string {
  return derToPem(buildMldsa65Pkcs8(seed), 'PRIVATE KEY')
}

export function parseMldsa65Seed(pkcs8Der: Uint8Array): Uint8Array {
  if (detectPkcs8Algorithm(pkcs8Der) !== 'ML_DSA_65') throw new Error('La llave no es ML-DSA-65.')
  const root = readDerNode(pkcs8Der)
  const children = derChildren(pkcs8Der, root)
  const privateOctets = children[2]
  if (privateOctets.tag !== 0x04) throw new Error('PKCS#8 ML-DSA sin privateKey OCTET STRING.')
  const inner = derContent(pkcs8Der, privateOctets)
  const choice = readDerNode(inner)
  if (choice.tag !== 0x80 || choice.next !== inner.length) {
    throw new Error('Solo se admite el formato seed de ML-DSA-65 (RFC 9881).')
  }
  const seed = derContent(inner, choice)
  if (seed.length !== 32) throw new Error('Seed ML-DSA-65 inválido.')
  return seed
}

export function buildMldsa65Spki(publicKey: Uint8Array): Uint8Array {
  if (publicKey.length !== 1952) throw new Error('La llave pública ML-DSA-65 debe tener 1952 bytes.')
  return derSequence(
    derSequence(derOid(OID_ML_DSA_65)),
    derBitString(publicKey),
  )
}

export function buildMldsa65PublicKeyPem(publicKey: Uint8Array): string {
  return derToPem(buildMldsa65Spki(publicKey), 'PUBLIC KEY')
}

export function parseMldsa65PublicKey(publicKeyPem: string): Uint8Array {
  if (detectPublicKeyAlgorithm(publicKeyPem) !== 'ML_DSA_65') throw new Error('La llave pública no es ML-DSA-65.')
  const der = pemToDer(publicKeyPem, 'PUBLIC KEY')
  const root = readDerNode(der)
  const children = derChildren(der, root)
  const bitString = children[1]
  if (bitString.tag !== 0x03) throw new Error('SPKI ML-DSA inválido.')
  const content = derContent(der, bitString)
  if (content.length !== 1953 || content[0] !== 0) throw new Error('BIT STRING ML-DSA-65 inválido.')
  return content.slice(1)
}
