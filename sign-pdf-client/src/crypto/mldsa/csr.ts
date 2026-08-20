import { derToPem } from '../encoding.ts'
import { OID_ML_DSA_65, buildMldsa65Spki } from '../keyFormats.ts'
import {
  derBitString,
  derContext0Empty,
  derIa5String,
  derIntegerNumber,
  derOid,
  derSequence,
  derSet,
  derUtf8String,
} from '../ecdsa/der.ts'
import type { CsrSubject } from '../ecdsa/csr.ts'
import { MldsaProvider } from './MldsaProvider.ts'

const OID_COMMON_NAME = '2.5.4.3'
const OID_EMAIL_ADDRESS = '1.2.840.113549.1.9.1'

function atv(oid: string, value: Uint8Array): Uint8Array {
  return derSequence(derOid(oid), value)
}

function buildSubject(subject: CsrSubject): Uint8Array {
  const commonName = subject.commonName.trim()
  const email = subject.email.trim()
  if (!commonName) throw new Error('CSR commonName is required.')
  if (!email || !email.includes('@')) throw new Error('A valid CSR email is required.')
  return derSequence(
    derSet(atv(OID_COMMON_NAME, derUtf8String(commonName))),
    derSet(atv(OID_EMAIL_ADDRESS, derIa5String(email))),
  )
}

export function createMldsa65Csr(seed: Uint8Array, publicKey: Uint8Array, subject: CsrSubject): string {
  const cri = derSequence(
    derIntegerNumber(0),
    buildSubject(subject),
    buildMldsa65Spki(publicKey),
    derContext0Empty(),
  )
  const provider = new MldsaProvider()
  const signature = provider.sign(cri, seed)
  const algorithm = derSequence(derOid(OID_ML_DSA_65))
  const csr = derSequence(cri, algorithm, derBitString(signature))
  return derToPem(csr, 'CERTIFICATE REQUEST')
}
