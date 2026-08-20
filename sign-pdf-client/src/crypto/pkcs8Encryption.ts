import { derChildren, derContent, decodeDerInteger, decodeDerOid, readDerNode } from './asn1.ts'
import { derToPem, pemToDer } from './encoding.ts'
import {
  derIntegerNumber,
  derNull,
  derOctetString,
  derOid,
  derSequence,
} from './ecdsa/der.ts'

const OID_PBES2 = '1.2.840.113549.1.5.13'
const OID_PBKDF2 = '1.2.840.113549.1.5.12'
const OID_HMAC_SHA256 = '1.2.840.113549.2.9'
const OID_AES_256_CBC = '2.16.840.1.101.3.4.1.42'
const PBKDF2_ITERATIONS = 310_000

function asArrayBuffer(data: Uint8Array): ArrayBuffer {
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
}

async function deriveAesKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  if (password.length < 8) throw new Error('La contraseña de la llave debe tener al menos 8 caracteres.')
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: asArrayBuffer(salt), iterations },
    material,
    { name: 'AES-CBC', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptPkcs8Der(pkcs8Der: Uint8Array, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(16))
  const key = await deriveAesKey(password, salt, PBKDF2_ITERATIONS)
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-CBC', iv: asArrayBuffer(iv) }, key, asArrayBuffer(pkcs8Der)),
  )

  const pbkdf2Params = derSequence(
    derOctetString(salt),
    derIntegerNumber(PBKDF2_ITERATIONS),
    derIntegerNumber(32),
    derSequence(derOid(OID_HMAC_SHA256), derNull()),
  )
  const pbes2Params = derSequence(
    derSequence(derOid(OID_PBKDF2), pbkdf2Params),
    derSequence(derOid(OID_AES_256_CBC), derOctetString(iv)),
  )
  const encryptedPrivateKeyInfo = derSequence(
    derSequence(derOid(OID_PBES2), pbes2Params),
    derOctetString(encrypted),
  )
  return derToPem(encryptedPrivateKeyInfo, 'ENCRYPTED PRIVATE KEY')
}

export async function decryptPrivateKeyPem(pem: string, password: string): Promise<Uint8Array> {
  const der = pemToDer(pem, 'ENCRYPTED PRIVATE KEY')
  const root = readDerNode(der)
  if (root.tag !== 0x30 || root.next !== der.length) throw new Error('EncryptedPrivateKeyInfo inválido.')
  const rootChildren = derChildren(der, root)
  if (rootChildren.length !== 2 || rootChildren[0].tag !== 0x30 || rootChildren[1].tag !== 0x04) {
    throw new Error('EncryptedPrivateKeyInfo inválido.')
  }

  const algChildren = derChildren(der, rootChildren[0])
  if (algChildren.length !== 2 || decodeDerOid(der, algChildren[0]) !== OID_PBES2) {
    throw new Error('La llave protegida no usa PBES2 compatible con SignPDF.')
  }
  const pbes2Children = derChildren(der, algChildren[1])
  if (pbes2Children.length !== 2) throw new Error('Parámetros PBES2 inválidos.')

  const kdfChildren = derChildren(der, pbes2Children[0])
  if (kdfChildren.length !== 2 || decodeDerOid(der, kdfChildren[0]) !== OID_PBKDF2) {
    throw new Error('La llave protegida no usa PBKDF2.')
  }
  const kdfParams = derChildren(der, kdfChildren[1])
  if (kdfParams.length !== 4 || kdfParams[0].tag !== 0x04) throw new Error('Parámetros PBKDF2 inválidos.')
  const salt = derContent(der, kdfParams[0])
  const iterations = decodeDerInteger(der, kdfParams[1])
  const keyLength = decodeDerInteger(der, kdfParams[2])
  const prfChildren = derChildren(der, kdfParams[3])
  if (
    salt.length < 16 ||
    iterations < 100_000 ||
    iterations > 5_000_000 ||
    keyLength !== 32 ||
    prfChildren.length < 1 ||
    decodeDerOid(der, prfChildren[0]) !== OID_HMAC_SHA256
  ) {
    throw new Error('Los parámetros PBKDF2 de la llave no son compatibles con SignPDF.')
  }

  const encChildren = derChildren(der, pbes2Children[1])
  if (encChildren.length !== 2 || decodeDerOid(der, encChildren[0]) !== OID_AES_256_CBC || encChildren[1].tag !== 0x04) {
    throw new Error('La llave protegida no usa AES-256-CBC.')
  }
  const iv = derContent(der, encChildren[1])
  if (iv.length !== 16) throw new Error('IV AES-CBC inválido.')
  const ciphertext = derContent(der, rootChildren[1])
  const key = await deriveAesKey(password, salt, iterations)

  try {
    return new Uint8Array(
      await crypto.subtle.decrypt({ name: 'AES-CBC', iv: asArrayBuffer(iv) }, key, asArrayBuffer(ciphertext)),
    )
  } catch {
    throw new Error('No se pudo descifrar la llave privada. Verifica la contraseña.')
  }
}
