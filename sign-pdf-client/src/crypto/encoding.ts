function bytesToBinary(bytes: Uint8Array): string {
  let out = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
    out += String.fromCharCode(...chunk);
  }
  return out;
}

export function bytesToBase64(bytes: Uint8Array): string {
  if (typeof btoa === "function") {
    return btoa(bytesToBinary(bytes));
  }
  // Node.js test/runtime fallback. Browsers use btoa above.
  const NodeBuffer = (globalThis as unknown as { Buffer?: { from(data: Uint8Array): { toString(enc: string): string } } }).Buffer;
  if (NodeBuffer) return NodeBuffer.from(bytes).toString("base64");
  throw new Error("No Base64 encoder is available in this runtime.");
}

export function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const normalized = base64.replace(/\s+/g, "");
  if (typeof atob === "function") {
    const binary = atob(normalized);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  const NodeBuffer = (globalThis as unknown as { Buffer?: { from(data: string, enc: string): Uint8Array } }).Buffer;
  if (NodeBuffer) return new Uint8Array(NodeBuffer.from(normalized, "base64"));
  throw new Error("No Base64 decoder is available in this runtime.");
}

export function derToPem(der: BufferSource, label: string): string {
  const bytes = der instanceof Uint8Array
    ? der
    : new Uint8Array(der instanceof ArrayBuffer ? der : der.buffer.slice(der.byteOffset, der.byteOffset + der.byteLength));
  const base64 = bytesToBase64(bytes);
  const lines = base64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----\n`;
}

export function pemToDer(pem: string, expectedLabel: string): Uint8Array<ArrayBuffer> {
  const begin = `-----BEGIN ${expectedLabel}-----`;
  const end = `-----END ${expectedLabel}-----`;
  const trimmed = pem.trim();
  if (!trimmed.startsWith(begin) || !trimmed.endsWith(end)) {
    throw new Error(`Expected PEM block ${expectedLabel}.`);
  }
  const body = trimmed.slice(begin.length, trimmed.length - end.length).replace(/\s+/g, "");
  if (!body || !/^[A-Za-z0-9+/]+={0,2}$/.test(body)) {
    throw new Error(`Invalid Base64 content in ${expectedLabel} PEM.`);
  }
  return base64ToBytes(body);
}

export function concatBytes(...parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export function utf8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}
