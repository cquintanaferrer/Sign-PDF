import type { SignatureProvider } from "../types.ts";
import { derToPem, pemToDer } from "../encoding.ts";

const KEY_ALGORITHM: EcKeyGenParams = { name: "ECDSA", namedCurve: "P-256" };
const SIGN_ALGORITHM: EcdsaParams = { name: "ECDSA", hash: "SHA-256" };

function asArrayBuffer(data: BufferSource): ArrayBuffer {
  if (data instanceof ArrayBuffer) return data;
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
}

export class EcdsaProvider implements SignatureProvider {
  async generateKeyPair(): Promise<CryptoKeyPair> {
    return crypto.subtle.generateKey(KEY_ALGORITHM, true, ["sign", "verify"]);
  }

  async exportPrivateKey(privateKey: CryptoKey): Promise<string> {
    if (privateKey.type !== "private") throw new Error("A private CryptoKey is required.");
    const der = await crypto.subtle.exportKey("pkcs8", privateKey);
    return derToPem(der, "PRIVATE KEY");
  }

  async exportPublicKey(publicKey: CryptoKey): Promise<string> {
    if (publicKey.type !== "public") throw new Error("A public CryptoKey is required.");
    const der = await crypto.subtle.exportKey("spki", publicKey);
    return derToPem(der, "PUBLIC KEY");
  }

  async importPrivateKey(pem: string): Promise<CryptoKey> {
    const der = pemToDer(pem, "PRIVATE KEY");
    return crypto.subtle.importKey("pkcs8", asArrayBuffer(der), KEY_ALGORITHM, true, ["sign"]);
  }

  async importPublicKey(pem: string): Promise<CryptoKey> {
    const der = pemToDer(pem, "PUBLIC KEY");
    return crypto.subtle.importKey("spki", asArrayBuffer(der), KEY_ALGORITHM, true, ["verify"]);
  }

  async sign(data: BufferSource, privateKey: CryptoKey): Promise<Uint8Array> {
    if (privateKey.type !== "private") throw new Error("A private CryptoKey is required for signing.");
    const signature = await crypto.subtle.sign(SIGN_ALGORITHM, privateKey, asArrayBuffer(data));
    const raw = new Uint8Array(signature);
    if (raw.length !== 64) throw new Error(`Unexpected Web Crypto P-256 signature length: ${raw.length}.`);
    return raw;
  }

  async verify(data: BufferSource, signature: BufferSource, publicKey: CryptoKey): Promise<boolean> {
    if (publicKey.type !== "public") throw new Error("A public CryptoKey is required for verification.");
    return crypto.subtle.verify(SIGN_ALGORITHM, publicKey, asArrayBuffer(signature), asArrayBuffer(data));
  }
}
