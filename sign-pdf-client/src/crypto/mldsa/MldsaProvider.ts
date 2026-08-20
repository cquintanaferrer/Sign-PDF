import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js'
import {
  buildMldsa65Pkcs8,
  buildMldsa65PublicKeyPem,
  parseMldsa65PublicKey,
  parseMldsa65Seed,
} from '../keyFormats.ts'

export interface Mldsa65KeyPair {
  seed: Uint8Array
  publicKey: Uint8Array
}

export class MldsaProvider {
  generateKeyPair(): Mldsa65KeyPair {
    const seed = crypto.getRandomValues(new Uint8Array(32))
    const keys = ml_dsa65.keygen(seed)
    return { seed, publicKey: new Uint8Array(keys.publicKey) }
  }

  exportPrivateKeyDer(seed: Uint8Array): Uint8Array {
    return buildMldsa65Pkcs8(seed)
  }

  exportPublicKey(publicKey: Uint8Array): string {
    return buildMldsa65PublicKeyPem(publicKey)
  }

  importSeed(pkcs8Der: Uint8Array): Uint8Array {
    return parseMldsa65Seed(pkcs8Der)
  }

  importPublicKey(publicKeyPem: string): Uint8Array {
    return parseMldsa65PublicKey(publicKeyPem)
  }

  sign(data: Uint8Array, seed: Uint8Array): Uint8Array {
    const keys = ml_dsa65.keygen(seed)
    try {
      return new Uint8Array(ml_dsa65.sign(data, keys.secretKey))
    } finally {
      keys.secretKey.fill(0)
    }
  }

  verify(data: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): boolean {
    return ml_dsa65.verify(signature, data, publicKey)
  }
}
