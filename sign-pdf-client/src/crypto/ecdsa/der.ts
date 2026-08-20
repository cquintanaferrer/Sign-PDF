import { concatBytes, utf8 } from "../encoding.ts";

export function derLength(length: number): Uint8Array {
  if (!Number.isSafeInteger(length) || length < 0) throw new Error("Invalid DER length.");
  if (length < 0x80) return Uint8Array.of(length);
  const bytes: number[] = [];
  let value = length;
  while (value > 0) {
    bytes.unshift(value & 0xff);
    value = Math.floor(value / 256);
  }
  return Uint8Array.of(0x80 | bytes.length, ...bytes);
}

export function der(tag: number, content: Uint8Array): Uint8Array<ArrayBuffer> {
  return concatBytes(Uint8Array.of(tag), derLength(content.length), content);
}

export function derSequence(...children: Uint8Array[]): Uint8Array<ArrayBuffer> {
  return der(0x30, concatBytes(...children));
}

export function derSet(...children: Uint8Array[]): Uint8Array<ArrayBuffer> {
  return der(0x31, concatBytes(...children));
}

export function derIntegerUnsigned(value: Uint8Array): Uint8Array<ArrayBuffer> {
  let first = 0;
  while (first < value.length - 1 && value[first] === 0) first++;
  let normalized = value.slice(first);
  if (normalized.length === 0) normalized = Uint8Array.of(0);
  if ((normalized[0] & 0x80) !== 0) normalized = concatBytes(Uint8Array.of(0), normalized);
  return der(0x02, normalized);
}

export function derIntegerNumber(value: number): Uint8Array {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("Only non-negative DER integers are supported.");
  if (value === 0) return der(0x02, Uint8Array.of(0));
  const bytes: number[] = [];
  let n = value;
  while (n > 0) {
    bytes.unshift(n & 0xff);
    n = Math.floor(n / 256);
  }
  return derIntegerUnsigned(Uint8Array.from(bytes));
}

export function derOid(oid: string): Uint8Array {
  const arcs = oid.split(".").map((v) => Number(v));
  if (arcs.length < 2 || arcs.some((v) => !Number.isSafeInteger(v) || v < 0)) throw new Error(`Invalid OID: ${oid}`);
  if (arcs[0] > 2 || (arcs[0] < 2 && arcs[1] > 39)) throw new Error(`Invalid OID: ${oid}`);
  const body: number[] = [40 * arcs[0] + arcs[1]];
  for (const arc of arcs.slice(2)) {
    const encoded: number[] = [arc & 0x7f];
    let n = Math.floor(arc / 128);
    while (n > 0) {
      encoded.unshift(0x80 | (n & 0x7f));
      n = Math.floor(n / 128);
    }
    body.push(...encoded);
  }
  return der(0x06, Uint8Array.from(body));
}

export function derUtf8String(value: string): Uint8Array {
  return der(0x0c, utf8(value));
}

export function derIa5String(value: string): Uint8Array {
  if (!/^[\x00-\x7F]*$/.test(value)) throw new Error("IA5String must contain ASCII only.");
  return der(0x16, Uint8Array.from(value, (c) => c.charCodeAt(0)));
}

export function derBitString(value: Uint8Array): Uint8Array<ArrayBuffer> {
  return der(0x03, concatBytes(Uint8Array.of(0), value));
}

export function derContext0Empty(): Uint8Array {
  // PKCS#10 attributes [0] IMPLICIT SET OF Attribute; empty for the MVP.
  return Uint8Array.of(0xa0, 0x00);
}


export function derOctetString(value: Uint8Array): Uint8Array {
  return der(0x04, value);
}

export function derNull(): Uint8Array {
  return Uint8Array.of(0x05, 0x00);
}

export function derContext0Primitive(value: Uint8Array): Uint8Array {
  return der(0x80, value);
}
