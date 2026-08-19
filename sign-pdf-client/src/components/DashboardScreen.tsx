import { ShieldIcon, LockIcon, KeyIcon, CheckIcon } from './icons'

type Algorithm = 'ECDSA_P256' | 'ML_DSA_65'

export interface CertSummary {
  algorithm: Algorithm
  serial: string
  issuedAt: string
  expiresAt: string
  status: 'pending' | 'active'
}

interface DashboardScreenProps {
  userName: string
  userEmail: string
  cert: CertSummary | null
  onRequestCert: () => void
  onSignDocuments: () => void
  onActivateDemoCert: () => void
  onLogout: () => void
}

export function DashboardScreen({
  userName,
  userEmail,
  cert,
  onRequestCert,
  onSignDocuments,
  onActivateDemoCert,
  onLogout,
}: DashboardScreenProps) {
  const firstName = (userName || userEmail).split(' ')[0]
  const algoLabel = cert?.algorithm === 'ECDSA_P256' ? 'ECDSA P-256' : 'ML-DSA-65'
  const isPostQuantum = cert?.algorithm === 'ML_DSA_65'
  const canSign = cert?.status === 'active'

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0f5fe' }}>
      {/* ── Top nav ── */}
      <nav style={{ backgroundColor: '#0a1628', borderBottom: '1px solid rgba(100,160,255,0.1)' }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ backgroundColor: '#10b981' }}>
              <ShieldIcon className="w-4 h-4 text-white" />
            </div>
            <span className="mono text-sm font-semibold tracking-widest uppercase text-white">
              CertSecure PKI
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-white text-sm font-medium leading-tight">{userName || userEmail}</p>
              <p className="mono text-xs" style={{ color: '#3b6fd4' }}>{userEmail}</p>
            </div>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0"
              style={{ backgroundColor: '#162c5e', color: '#a8c4f4' }}
            >
              {(userName || userEmail).charAt(0).toUpperCase()}
            </div>
            <button
              onClick={onLogout}
              className="mono text-xs underline hidden sm:block"
              style={{ color: '#3b6fd4' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#6b98e8')}
              onMouseLeave={e => (e.currentTarget.style.color = '#3b6fd4')}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* ── Welcome ── */}
        <div className="mb-10">
          <p className="mono text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#10b981' }}>
            Panel de control
          </p>
          <h1 className="text-3xl font-light mb-1" style={{ color: '#0a1628' }}>
            Bienvenido, <span className="font-semibold">{firstName}</span>
          </h1>
          <p className="text-sm" style={{ color: '#3b6fd4' }}>
            Gestiona tu identidad criptográfica y firma documentos desde un único lugar.
          </p>
        </div>

        {/* ── Demo shortcut banner ── */}
        {(!cert || cert.status === 'pending') && (
          <div
            className="rounded-xl px-5 py-3.5 mb-6 flex items-center justify-between gap-4 flex-wrap"
            style={{ backgroundColor: 'rgba(36,80,164,0.07)', border: '1px dashed rgba(36,80,164,0.3)' }}
          >
            <div className="flex items-center gap-2">
              <span className="mono text-xs" style={{ color: '#6b98e8' }}>
                🔧 Entorno de demo — no tienes certificado activo todavía.
              </span>
            </div>
            <button
              onClick={onActivateDemoCert}
              className="mono text-xs px-3 py-1.5 rounded-lg font-semibold flex-shrink-0 transition-all"
              style={{ backgroundColor: '#2450a4', color: 'white' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#162c5e')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#2450a4')}
            >
              Simular certificado activo →
            </button>
          </div>
        )}

        {/* ── Main action cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          {/* Card 1: Certificate */}
          <div
            className="rounded-2xl overflow-hidden flex flex-col"
            style={{ backgroundColor: 'white', border: '1.5px solid #dce8fd' }}
          >
            <div className="p-6 flex-1">
              <div className="flex items-start justify-between mb-5">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: cert ? 'rgba(36,80,164,0.08)' : '#f0f5fe' }}
                >
                  <ShieldIcon
                    className="w-6 h-6"
                    style={{ color: cert ? '#2450a4' : '#a8c4f4' }}
                  />
                </div>
                {cert ? (
                  <div
                    className="mono text-xs px-2.5 py-1 rounded-full font-semibold"
                    style={
                      cert.status === 'active'
                        ? { backgroundColor: 'rgba(16,185,129,0.1)', color: '#059669', border: '1px solid rgba(16,185,129,0.25)' }
                        : { backgroundColor: 'rgba(251,191,36,0.1)', color: '#d97706', border: '1px solid rgba(251,191,36,0.3)' }
                    }
                  >
                    {cert.status === 'active' ? '✓ ACTIVO' : '⏳ PENDIENTE'}
                  </div>
                ) : (
                  <div
                    className="mono text-xs px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: '#f0f5fe', color: '#a8c4f4', border: '1px solid #dce8fd' }}
                  >
                    SIN CERTIFICADO
                  </div>
                )}
              </div>

              <h2 className="font-semibold text-lg mb-1" style={{ color: '#0a1628' }}>
                Certificado digital
              </h2>
              <p className="text-sm leading-relaxed mb-5" style={{ color: '#3b6fd4' }}>
                {cert
                  ? 'Tu certificado X.509 está asociado a tu identidad criptográfica.'
                  : 'Solicita tu primer certificado generando un par de llaves criptográficas en tu dispositivo.'}
              </p>

              {cert && (
                <div className="space-y-2 mb-5">
                  {[
                    ['Algoritmo', algoLabel + (isPostQuantum ? ' · Post-Quantum' : '')],
                    ['Serie', cert.serial],
                    ['Emitido', cert.issuedAt],
                    ['Expira', cert.expiresAt],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between gap-3">
                      <span className="text-xs" style={{ color: '#6b98e8' }}>{k}</span>
                      <span className="mono text-xs font-medium" style={{ color: '#0a1628' }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 pb-6">
              <button
                onClick={onRequestCert}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2"
                style={{ backgroundColor: '#0a1628', color: 'white' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#162c5e')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#0a1628')}
              >
                <ShieldIcon className="w-4 h-4" />
                {cert ? 'Solicitar nuevo certificado' : 'Solicitar certificado'}
              </button>
            </div>
          </div>

          {/* Card 2: Sign documents */}
          <div
            className="rounded-2xl overflow-hidden flex flex-col"
            style={{
              backgroundColor: canSign ? 'white' : '#f8faff',
              border: `1.5px solid ${canSign ? '#dce8fd' : '#eef2fc'}`,
            }}
          >
            <div className="p-6 flex-1">
              <div className="flex items-start justify-between mb-5">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: canSign ? 'rgba(16,185,129,0.08)' : '#f0f5fe' }}
                >
                  <svg
                    className="w-6 h-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={canSign ? '#10b981' : '#dce8fd'}
                    strokeWidth="1.5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                </div>
                {canSign ? (
                  <div
                    className="mono text-xs px-2.5 py-1 rounded-full font-semibold"
                    style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#059669', border: '1px solid rgba(16,185,129,0.25)' }}
                  >
                    DISPONIBLE
                  </div>
                ) : (
                  <div
                    className="mono text-xs px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: '#f0f5fe', color: '#a8c4f4', border: '1px solid #dce8fd' }}
                  >
                    REQUIERE CERT
                  </div>
                )}
              </div>

              <h2 className="font-semibold text-lg mb-1" style={{ color: canSign ? '#0a1628' : '#a8c4f4' }}>
                Firma de documentos PDF
              </h2>
              <p className="text-sm leading-relaxed mb-5" style={{ color: canSign ? '#3b6fd4' : '#c5d5f0' }}>
                {canSign
                  ? 'Firma documentos PDF concatenando el hash de tus primitivas criptográficas. Tu llave privada nunca abandona tu dispositivo.'
                  : 'Necesitas un certificado activo para poder firmar documentos. Solicita uno primero.'}
              </p>

              {canSign && (
                <div className="space-y-2 mb-5">
                  {[
                    ['Algoritmo de firma', algoLabel],
                    ['Llave privada', 'En tu dispositivo · local'],
                    ['Formato salida', 'PDF con firma criptográfica'],
                    ['Hash primitivas', 'SHA-256(pub_key ∥ serial ∥ algo)'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-start justify-between gap-3">
                      <span className="text-xs flex-shrink-0" style={{ color: '#6b98e8' }}>{k}</span>
                      <span className="mono text-xs font-medium text-right" style={{ color: '#0a1628' }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}

              {!canSign && cert?.status === 'pending' && (
                <div
                  className="rounded-lg px-4 py-3 mb-4 flex items-center gap-2"
                  style={{ backgroundColor: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}
                >
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs" style={{ color: '#b45309' }}>
                    Tu certificado está siendo emitido. Podrás firmar documentos cuando esté activo.
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 pb-6">
              <button
                onClick={canSign ? onSignDocuments : undefined}
                disabled={!canSign}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: canSign ? '#10b981' : '#f0f5fe',
                  color: canSign ? '#022c22' : '#c5d5f0',
                }}
                onMouseEnter={e => { if (canSign) e.currentTarget.style.backgroundColor = '#34d399' }}
                onMouseLeave={e => { if (canSign) e.currentTarget.style.backgroundColor = '#10b981' }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                </svg>
                Firmar documentos
              </button>
            </div>
          </div>
        </div>

        {/* ── Security strip ── */}
        <div
          className="rounded-xl px-5 py-4 flex items-center justify-between flex-wrap gap-4"
          style={{ backgroundColor: '#0a1628' }}
        >
          <div className="flex items-center gap-3">
            <LockIcon className="w-4 h-4 flex-shrink-0" style={{ color: '#10b981' }} />
            <p className="mono text-xs" style={{ color: '#3b6fd4' }}>
              Sesión cifrada · TLS 1.3 · Zero-knowledge · Llaves locales
            </p>
          </div>
          <div className="flex gap-4">
            {['FIPS 140-3', 'RFC 5280', 'NIST PQC'].map(label => (
              <div key={label} className="text-center">
                <div className="mono text-xs font-semibold" style={{ color: '#10b981' }}>{label}</div>
                <div className="mono text-xs" style={{ color: '#1e3a78' }}>Compliant</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
