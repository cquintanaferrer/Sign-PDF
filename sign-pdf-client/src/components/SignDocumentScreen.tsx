import { useState, useRef, useCallback } from 'react'
import { CheckIcon, LockIcon, DownloadIcon, ShieldIcon } from './icons'

type Algorithm = 'ECDSA_P256' | 'ML_DSA_65'
type SignState = 'idle' | 'loaded' | 'signing' | 'signed'

const SIGN_STEPS = [
  { text: 'Leyendo documento PDF y extrayendo contenido binario...' },
  { text: 'Calculando hash SHA-256 del documento...' },
  { text: 'Cargando llave privada desde contexto local (Web Crypto API)...' },
  { text: 'Calculando hash de primitivas criptográficas (llave pública + metadatos)...' },
  { text: 'Concatenando hash del documento con hash de primitivas...' },
  { text: 'Firmando bloque concatenado con llave privada...' },
  { text: 'Construyendo bloque de firma PDF (ByteRange + Contents)...' },
  { text: 'Anexando firma criptográfica al final del documento...' },
]

// Deterministic fake hex from a seed string
function fakeHash(seed: string, len = 64): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  }
  const hex = '0123456789abcdef'
  let result = ''
  let state = Math.abs(h)
  for (let i = 0; i < len; i++) {
    state = (state * 1664525 + 1013904223) >>> 0
    result += hex[state % 16]
  }
  return result
}

function fakeBase64(seed: string, len = 88): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let state = seed.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0)
  let result = ''
  for (let i = 0; i < len; i++) {
    state = (state * 1664525 + 1013904223) >>> 0
    result += chars[state % chars.length]
  }
  return result + '=='
}

interface SignDocumentScreenProps {
  algorithm: Algorithm
  userName: string
  userEmail: string
  certSerial: string
  onBack: () => void
}

interface DocInfo {
  name: string
  size: number
  pages: number
  docHash: string
  primitiveHash: string
  concatHash: string
  signature: string
  pubKeyHash: string
  signedAt: string
}

export function SignDocumentScreen({ algorithm, userName, userEmail, certSerial, onBack }: SignDocumentScreenProps) {
  const [signState, setSignState] = useState<SignState>('idle')
  const [isDragging, setIsDragging] = useState(false)
  const [docInfo, setDocInfo] = useState<DocInfo | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [signedCount, setSignedCount] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  const algoLabel = algorithm === 'ECDSA_P256' ? 'ECDSA P-256' : 'ML-DSA-65'

  const loadFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) return
    const docHash = fakeHash(file.name + file.size)
    const pubKeyHash = fakeHash('pubkey_' + userEmail + algorithm)
    const primitiveHash = fakeHash(pubKeyHash + certSerial + algorithm)
    const concatHash = fakeHash(docHash + primitiveHash)
    const signature = fakeBase64(concatHash + 'sig')

    setDocInfo({
      name: file.name,
      size: file.size,
      pages: Math.max(1, Math.floor(file.size / 45000)),
      docHash,
      primitiveHash,
      concatHash,
      signature,
      pubKeyHash,
      signedAt: new Date().toISOString(),
    })
    setSignState('loaded')
  }, [userEmail, algorithm, certSerial])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) loadFile(file)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) loadFile(file)
  }

  const handleSign = () => {
    setSignState('signing')
    setCurrentStep(0)
    setCompletedSteps([])

    const DURATIONS = [600, 900, 700, 1100, 500, 1200, 800, 600]
    let stepIdx = 0

    const runStep = () => {
      if (stepIdx >= SIGN_STEPS.length) {
        setTimeout(() => {
          setSignState('signed')
          setSignedCount(c => c + 1)
        }, 400)
        return
      }
      setCurrentStep(stepIdx)
      setTimeout(() => {
        setCompletedSteps(prev => [...prev, stepIdx])
        stepIdx++
        setTimeout(runStep, 80)
      }, DURATIONS[stepIdx])
    }

    runStep()
  }

  const handleReset = () => {
    setSignState('idle')
    setDocInfo(null)
    setCurrentStep(0)
    setCompletedSteps([])
    if (fileRef.current) fileRef.current.value = ''
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(2)} MB`
  }

  const truncateHash = (h: string) => h.slice(0, 16) + '...' + h.slice(-8)

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0f5fe' }}>
      {/* Header */}
      <div className="w-full" style={{ backgroundColor: '#0a1628', borderBottom: '1px solid rgba(100,160,255,0.1)' }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 mono text-xs transition-colors"
              style={{ color: '#6b98e8' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#a8c4f4')}
              onMouseLeave={e => (e.currentTarget.style.color = '#6b98e8')}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Mis llaves
            </button>
            <div className="w-px h-4" style={{ backgroundColor: 'rgba(100,160,255,0.2)' }} />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: '#10b981' }}>
                <ShieldIcon className="w-4 h-4 text-white" />
              </div>
              <span className="mono text-sm font-semibold tracking-wider text-white">CertSecure PKI</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {signedCount > 0 && (
              <div
                className="mono text-xs px-3 py-1.5 rounded-full"
                style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }}
              >
                {signedCount} doc{signedCount > 1 ? 's' : ''} firmado{signedCount > 1 ? 's' : ''}
              </div>
            )}
            <div className="mono text-xs" style={{ color: '#3b6fd4' }}>{algoLabel}</div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Page header */}
        <div className="mb-8">
          <p className="mono text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#10b981' }}>
            Firma Digital de Documentos
          </p>
          <h1 className="text-2xl font-semibold mb-1" style={{ color: '#0a1628' }}>
            Firmar documento PDF
          </h1>
          <p className="text-sm" style={{ color: '#3b6fd4' }}>
            El hash SHA-256 del documento se concatena con el hash de tus primitivas criptográficas y se firma con tu llave privada.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: upload + doc info */}
          <div className="lg:col-span-2 space-y-4">
            {/* Upload zone */}
            {signState === 'idle' && (
              <div
                className="rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200"
                style={{
                  border: `2px dashed ${isDragging ? '#2450a4' : '#a8c4f4'}`,
                  backgroundColor: isDragging ? 'rgba(36,80,164,0.06)' : 'white',
                  padding: '48px 24px',
                }}
                onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: isDragging ? 'rgba(36,80,164,0.12)' : '#f0f5fe' }}
                >
                  <PdfIcon className="w-7 h-7" style={{ color: isDragging ? '#2450a4' : '#6b98e8' }} />
                </div>
                <p className="font-semibold text-sm mb-1" style={{ color: '#0a1628' }}>
                  Arrastra tu PDF aquí
                </p>
                <p className="text-xs mb-4" style={{ color: '#6b98e8' }}>
                  o haz clic para seleccionar
                </p>
                <div
                  className="mono text-xs px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: '#f0f5fe', color: '#a8c4f4', border: '1px solid #dce8fd' }}
                >
                  Solo archivos .pdf
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </div>
            )}

            {/* Document loaded card */}
            {(signState === 'loaded' || signState === 'signing' || signState === 'signed') && docInfo && (
              <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'white', border: '1.5px solid #dce8fd' }}>
                <div className="p-5" style={{ borderBottom: '1px solid #f0f5fe' }}>
                  <div className="flex items-start gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.15)' }}
                    >
                      <PdfIcon className="w-6 h-6" style={{ color: '#dc2626' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: '#0a1628' }}>{docInfo.name}</p>
                      <div className="flex gap-3 mt-1">
                        <span className="mono text-xs" style={{ color: '#6b98e8' }}>{formatSize(docInfo.size)}</span>
                        <span className="mono text-xs" style={{ color: '#6b98e8' }}>{docInfo.pages} página{docInfo.pages > 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    {signState === 'loaded' && (
                      <button
                        onClick={handleReset}
                        className="text-xs mono underline flex-shrink-0"
                        style={{ color: '#a8c4f4' }}
                      >
                        Cambiar
                      </button>
                    )}
                    {signState === 'signed' && (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#10b981' }}>
                        <CheckIcon className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Hash fields */}
                <div className="p-5 space-y-3">
                  <HashRow label="Hash documento" value={docInfo.docHash} truncate={truncateHash} ready={signState === 'signed'} />
                  <HashRow label="Hash llave pública" value={docInfo.pubKeyHash} truncate={truncateHash} ready={signState === 'signed'} />
                  <HashRow label="Hash primitivas" value={docInfo.primitiveHash} truncate={truncateHash} ready={signState === 'signed'} />
                  <HashRow label="Hash concatenado" value={docInfo.concatHash} truncate={truncateHash} ready={signState === 'signed'} highlight />
                </div>
              </div>
            )}

            {/* Sign / sign another button */}
            {signState === 'loaded' && (
              <button
                onClick={handleSign}
                className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200"
                style={{ backgroundColor: '#0a1628', color: 'white' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#162c5e')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#0a1628')}
              >
                <LockIcon className="w-4 h-4" />
                Firmar documento con {algoLabel}
              </button>
            )}

            {signState === 'signed' && (
              <div className="space-y-2">
                <button
                  className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200"
                  style={{ backgroundColor: '#2450a4', color: 'white' }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  <DownloadIcon className="w-4 h-4" />
                  Descargar PDF firmado
                </button>
                <button
                  onClick={handleReset}
                  className="w-full py-3 rounded-xl text-sm font-medium transition-all duration-200"
                  style={{ backgroundColor: 'white', color: '#3b6fd4', border: '1.5px solid #dce8fd' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#a8c4f4')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#dce8fd')}
                >
                  Firmar otro documento
                </button>
              </div>
            )}

            {/* Signer info card */}
            <div className="rounded-xl p-4" style={{ backgroundColor: 'white', border: '1px solid #dce8fd' }}>
              <p className="mono text-xs font-semibold tracking-wide uppercase mb-3" style={{ color: '#162c5e' }}>
                Identidad del firmante
              </p>
              <div className="space-y-2">
                {[
                  ['Nombre', userName || userEmail],
                  ['Email', userEmail],
                  ['Algoritmo', algoLabel],
                  ['Certificado', certSerial],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-start justify-between gap-2">
                    <span className="text-xs flex-shrink-0" style={{ color: '#6b98e8' }}>{k}</span>
                    <span className="mono text-xs text-right truncate" style={{ color: '#0a1628', maxWidth: '160px' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: signing process + result */}
          <div className="lg:col-span-3 space-y-4">
            {/* Idle state: explanation card */}
            {signState === 'idle' && (
              <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#0a1628' }}>
                <div className="p-6">
                  <p className="mono text-xs tracking-widest uppercase mb-4" style={{ color: '#10b981' }}>
                    Cómo funciona la firma
                  </p>
                  <div className="space-y-5">
                    {[
                      {
                        n: '01',
                        title: 'Hash del documento',
                        desc: 'SHA-256 del contenido binario del PDF genera una huella digital única e irreversible del documento.',
                        color: '#6b98e8',
                      },
                      {
                        n: '02',
                        title: 'Hash de primitivas criptográficas',
                        desc: `SHA-256(llave_pública ∥ serial_cert ∥ ${algoLabel}) vincula tu identidad criptográfica a la firma.`,
                        color: '#10b981',
                      },
                      {
                        n: '03',
                        title: 'Concatenación y firma',
                        desc: 'Se firma el hash concatenado (doc_hash ∥ primitives_hash) con tu llave privada local. El servidor nunca ve la llave privada.',
                        color: '#fbbf24',
                      },
                      {
                        n: '04',
                        title: 'Bloque anexado al PDF',
                        desc: 'La firma se integra al PDF como un bloque criptográfico al final del archivo, compatible con verificadores estándar.',
                        color: '#a78bfa',
                      },
                    ].map(step => (
                      <div key={step.n} className="flex gap-4">
                        <div
                          className="mono text-xs font-semibold w-6 flex-shrink-0 mt-0.5"
                          style={{ color: step.color }}
                        >
                          {step.n}
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium mb-1">{step.title}</p>
                          <p className="text-xs leading-relaxed" style={{ color: '#6b98e8' }}>{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="px-6 py-4 mono text-xs" style={{ backgroundColor: '#050d1a', color: '#3b6fd4', borderTop: '1px solid rgba(100,160,255,0.1)' }}>
                  Firma ejecutada localmente · Clave privada nunca abandona tu navegador
                </div>
              </div>
            )}

            {/* Signing animation */}
            {(signState === 'signing') && (
              <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#0a1628', border: '1px solid rgba(100,160,255,0.12)' }}>
                <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(100,160,255,0.1)' }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center pulse-glow" style={{ backgroundColor: 'rgba(16,185,129,0.15)' }}>
                    <LockIcon className="w-4 h-4" style={{ color: '#10b981' }} />
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">Proceso de firma en ejecución</p>
                    <p className="mono text-xs" style={{ color: '#3b6fd4' }}>Entorno: navegador local · {algoLabel}</p>
                  </div>
                </div>
                <div className="p-6 space-y-3">
                  {SIGN_STEPS.map((step, i) => {
                    const isDone = completedSteps.includes(i)
                    const isActive = i === currentStep && !isDone
                    return (
                      <div
                        key={i}
                        className="flex items-start gap-3 transition-all duration-200"
                        style={{ opacity: i > currentStep ? 0.25 : 1 }}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {isDone ? (
                            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: '#10b981' }}>
                              <CheckIcon className="w-3 h-3 text-white" />
                            </div>
                          ) : isActive ? (
                            <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: '#2450a4' }}>
                              <div className="w-2 h-2 rounded-full pulse-glow" style={{ backgroundColor: '#3b6fd4' }} />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2" style={{ borderColor: 'rgba(100,160,255,0.2)' }} />
                          )}
                        </div>
                        <p className="mono text-xs leading-relaxed" style={{ color: isDone ? '#6ee7b7' : isActive ? '#a8c4f4' : '#3b6fd4' }}>
                          {isActive && <span className="inline-block w-1.5 h-3 mr-1.5 align-middle pulse-glow" style={{ backgroundColor: '#3b6fd4' }} />}
                          {step.text}
                        </p>
                        {isDone && <span className="mono text-xs flex-shrink-0" style={{ color: '#059669' }}>OK</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Loaded state placeholder */}
            {signState === 'loaded' && (
              <div
                className="rounded-2xl p-8 flex flex-col items-center justify-center text-center"
                style={{ backgroundColor: 'white', border: '1.5px dashed #dce8fd', minHeight: '260px' }}
              >
                <LockIcon className="w-10 h-10 mb-4" style={{ color: '#dce8fd' }} />
                <p className="font-medium text-sm mb-1" style={{ color: '#a8c4f4' }}>
                  Listo para firmar
                </p>
                <p className="text-xs" style={{ color: '#dce8fd' }}>
                  Pulsa el botón para iniciar el proceso criptográfico
                </p>
              </div>
            )}

            {/* Signed result: signature block */}
            {signState === 'signed' && docInfo && (
              <div className="rounded-2xl overflow-hidden fade-in-up" style={{ border: '1.5px solid rgba(16,185,129,0.3)' }}>
                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between" style={{ backgroundColor: '#065f46' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(52,211,153,0.2)' }}>
                      <CheckIcon className="w-4 h-4" style={{ color: '#34d399' }} />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">Documento firmado correctamente</p>
                      <p className="mono text-xs" style={{ color: '#6ee7b7' }}>{docInfo.signedAt}</p>
                    </div>
                  </div>
                  <div className="mono text-xs px-3 py-1.5 rounded-full font-semibold" style={{ backgroundColor: 'rgba(52,211,153,0.2)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}>
                    VÁLIDO
                  </div>
                </div>

                {/* Signature block — terminal style */}
                <div className="p-6" style={{ backgroundColor: '#050d1a' }}>
                  <p className="mono text-xs mb-4" style={{ color: '#3b6fd4' }}>
                    <span style={{ color: '#10b981' }}>$</span> cat signature_block.txt
                  </p>
                  <div className="space-y-4">
                    <SigSection title="BLOQUE DE FIRMA CRIPTOGRÁFICA" color="#10b981">
                      <SigRow k="Versión" v="CertSecure-PKI v1.0" />
                      <SigRow k="Algoritmo" v={algoLabel} highlight />
                      <SigRow k="Firmante" v={userName || userEmail} />
                      <SigRow k="Serial cert" v={certSerial} />
                      <SigRow k="Timestamp" v={docInfo.signedAt} />
                    </SigSection>

                    <SigSection title="HASH DEL DOCUMENTO" color="#6b98e8">
                      <SigRow k="Algoritmo" v="SHA-256" />
                      <SigRow k="Digest" v={docInfo.docHash} mono long />
                    </SigSection>

                    <SigSection title="HASH DE PRIMITIVAS CRIPTOGRÁFICAS" color="#a78bfa">
                      <SigRow k="Llave pública" v={docInfo.pubKeyHash} mono long />
                      <SigRow k="Hash primitivas" v="SHA-256(pub_key ∥ serial_cert ∥ algo)" />
                      <SigRow k="Digest" v={docInfo.primitiveHash} mono long />
                    </SigSection>

                    <SigSection title="CONCATENACIÓN Y FIRMA" color="#fbbf24">
                      <SigRow k="Entrada" v="SHA-256(doc_hash ∥ primitives_hash)" />
                      <SigRow k="Hash concat" v={docInfo.concatHash} mono long highlight />
                      <SigRow k="Firma (Base64)" v={docInfo.signature} mono long />
                    </SigSection>
                  </div>

                  <div className="mt-5 pt-4 mono text-xs" style={{ borderTop: '1px solid rgba(100,160,255,0.1)', color: '#1e3a78' }}>
                    ─── EOF signature block · {docInfo.name} ───
                  </div>
                </div>

                {/* Verification note */}
                <div className="px-6 py-4 flex items-center gap-3" style={{ backgroundColor: 'rgba(16,185,129,0.06)', borderTop: '1px solid rgba(16,185,129,0.15)' }}>
                  <ShieldIcon className="w-4 h-4 flex-shrink-0" style={{ color: '#10b981' }} />
                  <p className="mono text-xs leading-relaxed" style={{ color: '#059669' }}>
                    Cualquier modificación al documento invalidará la firma. Verifica con{' '}
                    <span style={{ color: '#34d399' }}>certsecure verify --cert certificate.crt --doc documento.pdf</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function HashRow({
  label, value, truncate, ready, highlight,
}: {
  label: string
  value: string
  truncate: (v: string) => string
  ready: boolean
  highlight?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-xs flex-shrink-0" style={{ color: '#6b98e8' }}>{label}</span>
      <span
        className="mono text-xs text-right break-all"
        style={{ color: ready ? (highlight ? '#10b981' : '#0a1628') : '#dce8fd', maxWidth: '180px' }}
      >
        {ready ? truncate(value) : '—'}
      </span>
    </div>
  )
}

function SigSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mono text-xs font-semibold mb-2" style={{ color }}>
        ── {title} ──
      </p>
      <div className="pl-3 space-y-1.5" style={{ borderLeft: `2px solid ${color}30` }}>
        {children}
      </div>
    </div>
  )
}

function SigRow({
  k, v, mono, long, highlight,
}: {
  k: string; v: string; mono?: boolean; long?: boolean; highlight?: boolean
}) {
  return (
    <div className={`flex gap-2 ${long ? 'flex-col' : 'items-start'}`}>
      <span className="text-xs flex-shrink-0" style={{ color: '#3b6fd4', minWidth: long ? 'auto' : '90px' }}>
        {k}:
      </span>
      <span
        className={`${mono ? 'mono' : ''} text-xs break-all leading-relaxed`}
        style={{ color: highlight ? '#34d399' : '#a8c4f4' }}
      >
        {v}
      </span>
    </div>
  )
}

function PdfIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  )
}
