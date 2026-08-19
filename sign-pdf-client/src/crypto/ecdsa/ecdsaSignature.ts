import { concatBytes } from "../encoding.ts";
import { derIntegerUnsigned, derSequence } from "./der.ts";

export const P256_COMPONENT_BYTES = 32;
export const P256_RAW_SIGNATURE_BYTES = 64;

function readDerLength(data: Uint8Array, offset: number): { length: number; next: number } {
  if (offset >= data.length) throw new Error("Truncated DER length.");
  const first = data[offset++];
  if ((first & 0x80) === 0) return { length: first, next: offset };
  const count = first & 0x7f;
  if (count === 0 || count > 4 || offset + count > data.length) throw new Error("Unsupported DER length.");
  let length = 0;
  for (let i = 0; i < count; i++) length = (length * 256) + data[offset++];
  return { length, next: offset };
}

function readDerInteger(data: Uint8Array, offset: number): { value: Uint8Array; next: number } {
  if (data[offset++] !== 0x02) throw new Error("Expected DER INTEGER.");
  const { length, next } = readDerLength(data, offset);
  offset = next;
  if (length < 1 || offset + length > data.length) throw new Error("Invalid DER INTEGER length.");
  let value = data.slice(offset, offset + length);
  if ((value[0] & 0x80) !== 0) throw new Error("ECDSA INTEGER cannot be negative.");
  while (value.length > 1 && value[0] === 0) value = value.slice(1);
  return { value, next: offset + length };
}

function leftPad32(value: Uint8Array): Uint8Array {
  if (value.length > P256_COMPONENT_BYTES) throw new Error("ECDSA component is too large for P-256.");
  const out = new Uint8Array(P256_COMPONENT_BYTES);
  out.set(value, P256_COMPONENT_BYTES - value.length);
  return out;
}

export function rawP256SignatureToDer(raw: BufferSource): Uint8Array {
  const bytes = raw instanceof Uint8Array ? raw : new Uint8Array(raw as ArrayBuffer);
  if (bytes.length !== P256_RAW_SIGNATURE_BYTES) {
    throw new Error(`P-256 raw signature must be ${P256_RAW_SIGNATURE_BYTES} bytes.`);
  }
  return derSequence(
    derIntegerUnsigned(bytes.slice(0, P256_COMPONENT_BYTES)),
    derIntegerUnsigned(bytes.slice(P256_COMPONENT_BYTES)),
  );
}

export function derSignatureToRawP256(signatureDer: BufferSource): Uint8Array {
  const data = signatureDer instanceof Uint8Array ? signatureDer : new Uint8Array(signatureDer as ArrayBuffer);
  let offset = 0;
  if (data[offset++] !== 0x30) throw new Error("Expected DER SEQUENCE.");
  const sequenceLength = readDerLength(data, offset);
  offset = sequenceLength.next;
  if (offset + sequenceLength.length !== data.length) throw new Error("Invalid DER ECDSA sequence length.");
  const r = readDerInteger(data, offset);
  const s = readDerInteger(data, r.next);
  if (s.next !== data.length) throw new Error("Unexpected trailing data in DER ECDSA signature.");
  return concatBytes(leftPad32(r.value), leftPad32(s.value));
}
