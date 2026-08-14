import { useState } from 'react'
import { ShieldIcon, LockIcon, DownloadIcon, FileIcon, CheckIcon } from './icons'

type Algorithm = 'ECDSA_P256' | 'ML_DSA_65'

interface SuccessScreenProps {
  algorithm: Algorithm
  userName: string
  userEmail: string
  onReset: () => void
}

export function SuccessScreen({ algorithm, userName, userEmail, onReset }: SuccessScreenProps) {
  const [downloaded, setDownloaded] = useState<string[]>([])
  const algoLabel = algorithm === 'ECDSA_P256' ? 'ECDSA P-256' : 'ML-DSA-65'
  const isPostQuantum = algorithm === 'ML_DSA_65'

  const certSerial = '4A:F2:9C:01:7B:E3:' + (isPostQuantum ? 'PQ:44:FF' : 'D4:8A:12')

  const files = [
    {
      id: 'cert',
      name: 'certificate.crt',
      label: 'Certificado firmado por la AC',
      desc: 'Certificado X.509 v3 · Válido 365 días · SHA-256',
      size: '2.1 KB',
      color: '#2450a4',
      bg: 'rgba(36,80,164,0.06)',
      border: 'rgba(36,80,164,0.2)',
    },
    {
      id: 'private',
      name: 'private_key.pem',
      label: 'Llave privada local',
      desc: 'PKCS#8 · Generada en tu dispositivo · No almacenada en servidor',
      size: isPostQuantum ? '4.9 KB' : '1.7 KB',
      color: '#dc2626',
      bg: 'rgba(220,38,38,0.04)',
      border: 'rgba(220,38,38,0.2)',
    },
    {
      id: 'public',
      name: 'public_key.pem',
      label: 'Llave pública',
      desc: isPostQuantum ? 'Module-Lattice · SubjectPublicKeyInfo · 1.952 KB' : 'SubjectPublicKeyInfo · EC P-256 · 91 bytes',
      size: isPostQuantum ? '1.9 KB' : '0.1 KB',
      color: '#059669',
      bg: 'rgba(5,150,105,0.04)',
      border: 'rgba(5,150,105,0.2)',
    },
  ]

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0f5fe' }}>
      {/* Success banner */}
      <div className="w-full py-3 px-6 flex items-center justify-center gap-3" style={{ backgroundColor: '#065f46' }}>
        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#34d399' }}>
          <CheckIcon className="w-3 h-3" style={{ color: '#022c22' }} />
        </div>
        <p className="text-white font-medium text-sm">
          Certificado emitido con éxito ·{' '}
          <span className="mono" style={{ color: '#6ee7b7' }}>
            CN=CertSecure Root CA · Serial {certSerial}
          </span>
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldIcon className="w-5 h-5" style={{ color: '#059669' }} />
              <span className="mono text-xs font-semibold tracking-widest uppercase" style={{ color: '#059669' }}>
                Certificado Activo
              </span>
            </div>
            <h1 className="text-2xl font-semibold" style={{ color: '#0a1628' }}>
              Credenciales criptográficas listas
            </h1>
            <p className="text-sm mt-1" style={{ color: '#3b6fd4' }}>
              Hola <strong>{userName.split(' ')[0]}</strong>, descarga tus archivos y guárdalos en un lugar seguro
            </p>
          </div>
          <div
            className="rounded-xl px-4 py-3 text-right"
            style={{ backgroundColor: 'white', border: '1px solid #dce8fd' }}
          >
            <p className="mono text-xs mb-0.5" style={{ color: '#6b98e8' }}>Algoritmo registrado</p>
            <p className="mono font-semibold" style={{ color: isPostQuantum ? '#059669' : '#2450a4' }}>
              {algoLabel}
            </p>
            {isPostQuantum && (
              <p className="mono text-xs mt-0.5" style={{ color: '#10b981' }}>Post-Quantum · FIPS 204</p>
            )}
          </div>
        </div>

        {/* WARNING */}
        <div
          className="rounded-xl p-5 mb-8 flex gap-4"
          style={{ backgroundColor: '#fffbeb', border: '2px solid #f59e0b' }}
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#fef3c7' }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-sm mb-1" style={{ color: '#92400e' }}>
              IMPORTANTE — Acción requerida ahora
            </p>
            <p className="text-sm leading-relaxed" style={{ color: '#b45309' }}>
              Descarga y guarda tu <strong>Llave Privada</strong> en este momento. Por diseño de seguridad,{' '}
              <strong>no la almacenamos en ningún servidor</strong>. Si la pierdes, deberás revocar este certificado y emitir uno nuevo.
            </p>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {['Gestor de contraseñas', 'USB cifrado', 'Vault / HSM', 'Almacenamiento offline'].map(tip => (
                <span
                  key={tip}
                  className="mono text-xs px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}
                >
                  ✓ {tip}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Download cards */}
        <div className="space-y-3 mb-8">
          {files.map(file => {
            const isDone = downloaded.includes(file.id)
            return (
              <div
                key={file.id}
                className="rounded-xl p-5 flex items-center gap-5 transition-all duration-200"
                style={{
                  backgroundColor: isDone ? file.bg : 'white',
                  border: `1.5px solid ${isDone ? file.color : '#dce8fd'}`,
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
                    {isDone && (
                      <span
                        className="mono text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: '#d1fae5', color: '#065f46' }}
                      >
                        ✓ Descargado
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: '#3b6fd4' }}>{file.label}</p>
                  <p className="mono text-xs mt-0.5" style={{ color: '#a8c4f4' }}>{file.desc}</p>
                </div>

                <button
                  onClick={() => setDownloaded(d => [...d, file.id])}
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

        {/* Certificate summary */}
        <div
          className="rounded-xl p-5 mb-6"
          style={{ backgroundColor: 'white', border: '1px solid #dce8fd' }}
        >
          <p className="text-xs font-semibold tracking-wide uppercase mb-4" style={{ color: '#162c5e' }}>
            Resumen del certificado
          </p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
            {[
              ['Sujeto', `CN=${userName}`],
              ['Email', userEmail],
              ['Emisor', 'CN=CertSecure Root CA'],
              ['Número de serie', certSerial],
              ['Válido desde', new Date().toLocaleDateString('es-ES')],
              ['Válido hasta', new Date(Date.now() + 365 * 86400000).toLocaleDateString('es-ES')],
              ['Algoritmo', algoLabel],
              ['Uso de clave', 'Digital Signature'],
              ['Estado', 'VALID · ACTIVE'],
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
            Emitir nuevo certificado
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
