import { useState, useEffect } from 'react'
import { ShieldIcon, LockIcon, DownloadIcon, FileIcon, CheckIcon, KeyIcon } from './icons'
import { getCertificateStatus } from '../services/api'

type Algorithm = 'ECDSA_P256' | 'ML_DSA_65'

type CertStep = 'received' | 'validating' | 'signing' | 'ready'

interface CertStatusStep {
  id: CertStep
  label: string
  sublabel: string
}

const CERT_STEPS: CertStatusStep[] = [
  { id: 'received',   label: 'CSR recibido por la AC',              sublabel: 'Solicitud registrada en el servidor' },
  { id: 'validating', label: 'Validando identidad del solicitante',  sublabel: 'Comprobación de datos y firma del CSR' },
  { id: 'signing',    label: 'Firma del certificado por la AC',      sublabel: 'Emisión del certificado X.509 v3' },
  { id: 'ready',      label: 'Certificado disponible para descarga', sublabel: 'Notificación por email al completarse' },
]

interface KeysReadyScreenProps {
  algorithm: Algorithm
  userName: string
  userEmail: string
  privateKeyPem: string
  publicKeyPem: string
  certId: number
  token: string
  onReset: () => void
}

function downloadTextFile(content: string, filename: string, mimeType = 'application/x-pem-file') {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const POLL_INTERVAL_MS = 4000

export function KeysReadyScreen({ algorithm, userName, userEmail, privateKeyPem, publicKeyPem, certId, token, onReset }: KeysReadyScreenProps) {
  const [downloaded, setDownloaded] = useState<string[]>([])
  const [certProgress, setCertProgress] = useState<CertStep>('received')
  const [signedCertificate, setSignedCertificate] = useState<string | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  const algoLabel = algorithm === 'ECDSA_P256' ? 'ECDSA P-256' : 'ML-DSA-65'
  const isPostQuantum = algorithm === 'ML_DSA_65'
  const firstName = (userName || userEmail).split(' ')[0]

  // El backend solo expone dos estados reales (PENDING / ISSUED), así que
  // 'validating' y 'signing' son pasos visuales intermedios mientras se
  // espera la confirmación real; 'ready' solo llega cuando el backend
  // confirma la emisión vía polling a /certificates/{id}/status.
  useEffect(() => {
    const t1 = setTimeout(() => setCertProgress(p => (p === 'received' ? 'validating' : p)), 3000)
    const t2 = setTimeout(() => setCertProgress(p => (p === 'validating' ? 'signing' : p)), 8000)

    const poll = async () => {
      try {
        const cert = await getCertificateStatus(certId, token)
        if (cert.status === 'ISSUED' && cert.signed_certificate) {
          setSignedCertificate(cert.signed_certificate)
          setCertProgress('ready')
        }
      } catch (err) {
        console.error(err)
      }
    }

    poll()
    const pollId = setInterval(() => {
      setCertProgress(current => {
        if (current === 'ready') return current
        poll()
        return current
      })
    }, POLL_INTERVAL_MS)

    return () => { clearTimeout(t1); clearTimeout(t2); clearInterval(pollId) }
  }, [certId, token])

  // Elapsed time counter
  useEffect(() => {
    const id = setInterval(() => setElapsedSeconds(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const formatElapsed = (s: number) => {
    if (s < 60) return `hace ${s}s`
    return `hace ${Math.floor(s / 60)}m ${s % 60}s`
  }

  const stepOrder: CertStep[] = ['received', 'validating', 'signing', 'ready']
  const currentStepIndex = stepOrder.indexOf(certProgress)

  const keyFiles = [
    {
      id: 'private',
      name: 'private_key.pem',
      label: 'Llave privada',
      desc: 'PKCS#8 · Generada en tu dispositivo · No almacenada en ningún servidor',
      size: `${(new Blob([privateKeyPem]).size / 1024).toFixed(1)} KB`,
      color: '#dc2626',
      bg: 'rgba(220,38,38,0.05)',
      border: 'rgba(220,38,38,0.2)',
      urgency: true,
      content: privateKeyPem,
    },
    {
      id: 'public',
      name: 'public_key.pem',
      label: 'Llave pública',
      desc: isPostQuantum ? 'Module-Lattice · SubjectPublicKeyInfo' : 'SubjectPublicKeyInfo · EC P-256',
      size: `${(new Blob([publicKeyPem]).size / 1024).toFixed(1)} KB`,
      color: '#059669',
      bg: 'rgba(5,150,105,0.05)',
      border: 'rgba(5,150,105,0.2)',
      urgency: false,
      content: publicKeyPem,
    },
  ]

  const allCriticalDownloaded = downloaded.includes('private') && downloaded.includes('public')

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0f5fe' }}>
      {/* Top banner */}
      <div
        className="w-full py-3 px-6 flex items-center justify-center gap-3 transition-colors duration-700"
        style={{ backgroundColor: certProgress === 'ready' ? '#1e3a78' : '#065f46' }}
      >
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: certProgress === 'ready' ? '#6b98e8' : '#34d399' }}
        >
          <CheckIcon className="w-3 h-3" style={{ color: certProgress === 'ready' ? '#0a1628' : '#022c22' }} />
        </div>
        <p className="text-white font-medium text-sm">
          {certProgress === 'ready'
            ? <>Certificado emitido y listo para descarga · <span className="mono" style={{ color: '#a8c4f4' }}>{algoLabel} · {formatElapsed(elapsedSeconds)}</span></>
            : <>Llaves criptográficas generadas · <span className="mono" style={{ color: '#6ee7b7' }}>{algoLabel} · Certificado pendiente</span></>
          }
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <KeyIcon className="w-5 h-5" style={{ color: '#059669' }} />
              <span className="mono text-xs font-semibold tracking-widest uppercase" style={{ color: '#059669' }}>
                Paso 4 de 4 · Llaves listas
              </span>
            </div>
            <h1 className="text-2xl font-semibold" style={{ color: '#0a1628' }}>
              {certProgress === 'ready' ? 'Descarga tus llaves y certificado' : 'Descarga tus llaves criptográficas'}
            </h1>
            <p className="text-sm mt-1" style={{ color: '#3b6fd4' }}>
              {certProgress === 'ready'
                ? <>Hola <strong>{firstName}</strong>. Tu certificado ha sido emitido. Ya puedes descargarlo junto con tus llaves.</>
                : <>Hola <strong>{firstName}</strong>. Tu certificado se emitirá en breve de forma asíncrona. Descarga tus llaves ahora.</>
              }
            </p>
          </div>
          <div className="rounded-xl px-4 py-3 text-right" style={{ backgroundColor: 'white', border: '1px solid #dce8fd' }}>
            <p className="mono text-xs mb-0.5" style={{ color: '#6b98e8' }}>Algoritmo</p>
            <p className="mono font-semibold text-sm" style={{ color: isPostQuantum ? '#059669' : '#2450a4' }}>
              {algoLabel}
            </p>
            {isPostQuantum && <p className="mono text-xs" style={{ color: '#10b981' }}>Post-Quantum</p>}
          </div>
        </div>

        {/* ── CRITICAL WARNING ── */}
        <div
          className="rounded-xl p-5 mb-8 flex gap-4"
          style={{ backgroundColor: '#fffbeb', border: '2px solid #f59e0b' }}
        >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#fef3c7' }}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-sm mb-1" style={{ color: '#92400e' }}>
              IMPORTANTE — Descarga tu llave privada ahora
            </p>
            <p className="text-sm leading-relaxed" style={{ color: '#b45309' }}>
              Por diseño de seguridad, <strong>tu llave privada no está almacenada en ningún servidor</strong>.
              Esta es tu única oportunidad de descargarla. Si la pierdes, deberás revocar el certificado y generar un nuevo par de llaves.
            </p>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {['Gestor de contraseñas', 'USB cifrado', 'Vault / HSM', 'Almacenamiento offline'].map(tip => (
                <span key={tip} className="mono text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}>
                  ✓ {tip}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Download cards ── */}
        <div className="space-y-3 mb-10">
          {keyFiles.map(file => {
            const isDone = downloaded.includes(file.id)
            return (
              <div
                key={file.id}
                className="rounded-xl p-5 flex items-center gap-5 transition-all duration-200"
                style={{
                  backgroundColor: isDone ? file.bg : 'white',
                  border: `1.5px solid ${isDone ? file.color : file.urgency ? 'rgba(220,38,38,0.35)' : '#dce8fd'}`,
                  boxShadow: file.urgency && !isDone ? '0 0 0 3px rgba(220,38,38,0.08)' : 'none',
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: file.bg, border: `1px solid ${file.border}` }}
                >
                  <FileIcon className="w-6 h-6" style={{ color: file.color }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="mono font-semibold text-sm" style={{ color: '#0a1628' }}>{file.name}</p>
                    <span className="mono text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#f0f5fe', color: '#6b98e8' }}>
                      {file.size}
                    </span>
                    {file.urgency && !isDone && (
                      <span className="mono text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: 'rgba(220,38,38,0.1)', color: '#dc2626' }}>
                        ⚠ Acción requerida
                      </span>
                    )}
                    {isDone && (
                      <span className="mono text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#d1fae5', color: '#065f46' }}>
                        ✓ Descargado
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: '#3b6fd4' }}>{file.label}</p>
                  <p className="mono text-xs mt-0.5" style={{ color: '#a8c4f4' }}>{file.desc}</p>
                </div>

                <button
                  onClick={() => {
                    downloadTextFile(file.content, file.name)
                    setDownloaded(d => d.includes(file.id) ? d : [...d, file.id])
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold flex-shrink-0 transition-all duration-200"
                  style={{
                    backgroundColor: isDone ? 'transparent' : file.color,
                    color: isDone ? file.color : 'white',
                    border: `1.5px solid ${file.color}`,
                  }}
                  onMouseEnter={e => { if (!isDone) e.currentTarget.style.opacity = '0.85' }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
                >
                  <DownloadIcon className="w-4 h-4" />
                  {isDone ? 'Volver a descargar' : 'Descargar'}
                </button>
              </div>
            )
          })}
        </div>

        {/* ── Certificate async status ── */}
        <div
          className="rounded-2xl overflow-hidden mb-6"
          style={{ border: '1.5px solid #dce8fd' }}
        >
          {/* Status header */}
          <div
            className="px-6 py-4 flex items-center justify-between flex-wrap gap-3 transition-colors duration-700"
            style={{ backgroundColor: '#0a1628' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-700"
                style={{ backgroundColor: certProgress === 'ready' ? 'rgba(16,185,129,0.2)' : 'rgba(251,191,36,0.15)' }}
              >
                {certProgress === 'ready' ? (
                  <CheckIcon className="w-4 h-4" style={{ color: '#10b981' }} />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-white font-medium text-sm">
                  {certProgress === 'ready' ? 'Certificado emitido correctamente' : 'Certificado en proceso de emisión'}
                </p>
                <p className="mono text-xs" style={{ color: '#3b6fd4' }}>
                  Autoridad de Certificación CertSecure · {certProgress === 'ready' ? algoLabel : 'Proceso asíncrono'}
                </p>
              </div>
            </div>
            <div
              className="mono text-xs px-3 py-1.5 rounded-full font-semibold transition-all duration-700"
              style={
                certProgress === 'ready'
                  ? { backgroundColor: 'rgba(16,185,129,0.2)', color: '#34d399', border: '1px solid rgba(16,185,129,0.4)' }
                  : { backgroundColor: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }
              }
            >
              {certProgress === 'ready' ? 'EMITIDO' : 'PENDIENTE'}
            </div>
          </div>

          {/* Timeline steps */}
          <div className="p-6 space-y-0" style={{ backgroundColor: 'white' }}>
            {CERT_STEPS.map((step, i) => {
              const stepIdx = stepOrder.indexOf(step.id)
              const isDone = certProgress === 'ready' || stepIdx < currentStepIndex
              const isActive = certProgress !== 'ready' && stepIdx === currentStepIndex
              const isPending = certProgress !== 'ready' && stepIdx > currentStepIndex

              return (
                <div key={step.id} className="flex gap-4">
                  {/* Left: icon + connector */}
                  <div className="flex flex-col items-center">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-all duration-500"
                      style={{
                        backgroundColor: isDone ? '#10b981' : isActive ? '#fbbf24' : '#f0f5fe',
                        border: isPending ? '2px solid #dce8fd' : 'none',
                      }}
                    >
                      {isDone ? (
                        <CheckIcon className="w-4 h-4 text-white" />
                      ) : isActive ? (
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="9" stroke="rgba(92,48,0,0.2)" strokeWidth="2.5" />
                          <path d="M12 3a9 9 0 019 9" stroke="#92400e" strokeWidth="2.5" strokeLinecap="round" />
                        </svg>
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#dce8fd' }} />
                      )}
                    </div>
                    {i < CERT_STEPS.length - 1 && (
                      <div
                        className="w-0.5 flex-1 my-1 transition-all duration-700"
                        style={{
                          backgroundColor: isDone ? '#10b981' : '#dce8fd',
                          minHeight: '28px',
                        }}
                      />
                    )}
                  </div>

                  {/* Right: content */}
                  <div className={`pb-5 flex-1 ${i === CERT_STEPS.length - 1 ? 'pb-0' : ''}`}>
                    <div className="flex items-start justify-between gap-2 pt-1">
                      <div>
                        <p
                          className="font-medium text-sm transition-colors duration-300"
                          style={{ color: isDone ? '#0a1628' : isActive ? '#92400e' : '#a8c4f4' }}
                        >
                          {step.label}
                        </p>
                        <p
                          className="mono text-xs mt-0.5"
                          style={{ color: isDone ? '#6b98e8' : isActive ? '#b45309' : '#dce8fd' }}
                        >
                          {step.sublabel}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        {isDone && (
                          <span className="mono text-xs" style={{ color: '#10b981' }}>
                            {formatElapsed(Math.max(0, elapsedSeconds - (currentStepIndex - stepIdx) * 3))}
                          </span>
                        )}
                        {isActive && (
                          <span className="mono text-xs pulse-glow" style={{ color: '#f59e0b' }}>
                            en proceso...
                          </span>
                        )}
                        {isPending && (
                          <span className="mono text-xs" style={{ color: '#dce8fd' }}>
                            pendiente
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div
            className="px-6 py-4 flex items-center justify-between flex-wrap gap-3 transition-colors duration-700"
            style={{ backgroundColor: '#f0f5fe', borderTop: '1px solid #dce8fd' }}
          >
            {certProgress === 'ready' ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: '#10b981' }}>
                    <CheckIcon className="w-2.5 h-2.5 text-white" />
                  </div>
                  <p className="text-xs" style={{ color: '#065f46' }}>
                    Email de notificación enviado a <strong>{userEmail}</strong>
                  </p>
                </div>
                <div className="mono text-xs px-3 py-1.5 rounded-lg" style={{ backgroundColor: '#d1fae5', color: '#065f46', border: '1px solid rgba(16,185,129,0.3)' }}>
                  {formatElapsed(elapsedSeconds)}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <EnvelopeSmallIcon />
                  <p className="text-xs" style={{ color: '#3b6fd4' }}>
                    Recibirás un email en <strong>{userEmail}</strong> cuando el certificado esté listo
                  </p>
                </div>
                <div className="mono text-xs px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'white', color: '#6b98e8', border: '1px solid #dce8fd' }}>
                  Tiempo estimado: 5-30 min
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Certificate download card (appears when ready) ── */}
        {certProgress === 'ready' && signedCertificate && (
          <div
            className="rounded-xl p-5 mb-6 flex items-center gap-5 fade-in-up"
            style={{
              backgroundColor: downloaded.includes('cert') ? 'rgba(36,80,164,0.06)' : 'white',
              border: `1.5px solid ${downloaded.includes('cert') ? '#2450a4' : '#a8c4f4'}`,
              boxShadow: downloaded.includes('cert') ? 'none' : '0 0 0 3px rgba(36,80,164,0.08)',
            }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgba(36,80,164,0.08)', border: '1px solid rgba(36,80,164,0.2)' }}
            >
              <ShieldIcon className="w-6 h-6" style={{ color: '#2450a4' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="mono font-semibold text-sm" style={{ color: '#0a1628' }}>certificate.crt</p>
                <span className="mono text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#f0f5fe', color: '#6b98e8' }}>
                  {(new Blob([signedCertificate]).size / 1024).toFixed(1)} KB
                </span>
                <span
                  className="mono text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ backgroundColor: 'rgba(16,185,129,0.12)', color: '#059669', border: '1px solid rgba(16,185,129,0.3)' }}
                >
                  ✓ Disponible ahora
                </span>
                {downloaded.includes('cert') && (
                  <span className="mono text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#d1fae5', color: '#065f46' }}>
                    ✓ Descargado
                  </span>
                )}
              </div>
              <p className="text-xs mt-0.5" style={{ color: '#3b6fd4' }}>Certificado X.509 v3 firmado por la AC</p>
              <p className="mono text-xs mt-0.5" style={{ color: '#a8c4f4' }}>
                SHA-256 · Válido 365 días · Emisor: CN=CertSecure Root CA · {algoLabel}
              </p>
            </div>
            <button
              onClick={() => {
                downloadTextFile(signedCertificate, 'certificate.crt', 'application/x-x509-ca-cert')
                setDownloaded(d => d.includes('cert') ? d : [...d, 'cert'])
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold flex-shrink-0 transition-all duration-200"
              style={{
                backgroundColor: downloaded.includes('cert') ? 'transparent' : '#2450a4',
                color: downloaded.includes('cert') ? '#2450a4' : 'white',
                border: '1.5px solid #2450a4',
              }}
              onMouseEnter={e => { if (!downloaded.includes('cert')) e.currentTarget.style.opacity = '0.85' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
            >
              <DownloadIcon className="w-4 h-4" />
              {downloaded.includes('cert') ? 'Volver a descargar' : 'Descargar'}
            </button>
          </div>
        )}

        {/* Confirmation when both critical files are downloaded */}
        {allCriticalDownloaded && (
          <div
            className="rounded-xl p-4 mb-6 flex items-center gap-3 fade-in-up"
            style={{ backgroundColor: 'rgba(16,185,129,0.08)', border: '1.5px solid rgba(16,185,129,0.3)' }}
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#10b981' }}>
              <CheckIcon className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-medium text-sm" style={{ color: '#065f46' }}>
                Llaves guardadas correctamente
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#059669' }}>
                Tus llaves están a salvo. Te notificaremos cuando el certificado sea emitido.
              </p>
            </div>
          </div>
        )}

        {/* Algo + cert summary */}
        <div className="rounded-xl p-5 mb-6" style={{ backgroundColor: 'white', border: '1px solid #dce8fd' }}>
          <p className="text-xs font-semibold tracking-wide uppercase mb-4" style={{ color: '#162c5e' }}>
            Resumen de la solicitud
          </p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
            {[
              ['Solicitante', userName || userEmail],
              ['Email', userEmail],
              ['Algoritmo', algoLabel],
              ['Estándar', isPostQuantum ? 'NIST FIPS 204' : 'NIST FIPS 186-4'],
              ['CSR enviado', new Date().toLocaleString('es-ES')],
              ['Estado certificado', certProgress === 'ready' ? 'Emitido' : 'Pendiente de emisión'],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-xs mb-0.5" style={{ color: '#6b98e8' }}>{k}</p>
                <p className="mono text-xs font-medium" style={{ color: '#0a1628' }}>{v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <button
            onClick={onReset}
            className="text-sm underline transition-colors"
            style={{ color: '#6b98e8' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#2450a4')}
            onMouseLeave={e => (e.currentTarget.style.color = '#6b98e8')}
          >
            Volver al inicio de sesión
          </button>
          <div className="flex items-center gap-2">
            <LockIcon className="w-3.5 h-3.5" style={{ color: '#10b981' }} />
            <span className="mono text-xs" style={{ color: '#10b981' }}>Sesión cifrada · TLS 1.3</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function EnvelopeSmallIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="#3b6fd4" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  )
}
