import { concatBytes } from './encoding.ts'

export interface DerNode {
  tag: number
  contentStart: number
  contentEnd: number
  next: number
}

export function readDerNode(data: Uint8Array, offset = 0): DerNode {
  if (offset >= data.length) throw new Error('DER truncado.')
  const tag = data[offset++]
  if (offset >= data.length) throw new Error('Longitud DER truncada.')
  const first = data[offset++]
  let length = 0
  if ((first & 0x80) === 0) {
    length = first
  } else {
    const count = first & 0x7f
    if (count === 0 || count > 4 || offset + count > data.length) {
      throw new Error('Longitud DER no soportada.')
    }
    for (let i = 0; i < count; i++) length = length * 256 + data[offset++]
  }
  const contentStart = offset
  const contentEnd = contentStart + length
  if (contentEnd > data.length) throw new Error('Contenido DER truncado.')
  return { tag, contentStart, contentEnd, next: contentEnd }
}

export function derChildren(data: Uint8Array, node: DerNode): DerNode[] {
  const children: DerNode[] = []
  let offset = node.contentStart
  while (offset < node.contentEnd) {
    const child = readDerNode(data, offset)
    if (child.next > node.contentEnd) throw new Error('DER hijo fuera de rango.')
    children.push(child)
    offset = child.next
  }
  if (offset !== node.contentEnd) throw new Error('DER inválido.')
  return children
}

export function derContent(data: Uint8Array, node: DerNode): Uint8Array {
  return data.slice(node.contentStart, node.contentEnd)
}

export function decodeDerInteger(data: Uint8Array, node: DerNode): number {
  if (node.tag !== 0x02) throw new Error('Se esperaba INTEGER DER.')
  const bytes = derContent(data, node)
  if (!bytes.length || (bytes[0] & 0x80)) throw new Error('INTEGER DER inválido.')
  let value = 0
  for (const b of bytes) {
    value = value * 256 + b
    if (!Number.isSafeInteger(value)) throw new Error('INTEGER DER demasiado grande.')
  }
  return value
}

export function decodeDerOid(data: Uint8Array, node: DerNode): string {
  if (node.tag !== 0x06) throw new Error('Se esperaba OID DER.')
  const bytes = derContent(data, node)
  if (!bytes.length) throw new Error('OID vacío.')
  const arcs: number[] = []
  const first = bytes[0]
  arcs.push(first < 80 ? Math.floor(first / 40) : 2)
  arcs.push(first < 80 ? first % 40 : first - 80)
  let value = 0
  for (let i = 1; i < bytes.length; i++) {
    value = value * 128 + (bytes[i] & 0x7f)
    if ((bytes[i] & 0x80) === 0) {
      arcs.push(value)
      value = 0
    }
  }
  if (value !== 0) throw new Error('OID truncado.')
  return arcs.join('.')
}

export function concatDer(...parts: Uint8Array[]): Uint8Array {
  return concatBytes(...parts)
}
