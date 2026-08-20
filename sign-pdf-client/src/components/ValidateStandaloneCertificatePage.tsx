import { useRef, useState } from 'react'
import { CheckIcon, FileIcon, LockIcon, ShieldIcon } from './icons'

interface ValidateStandaloneCertificatePageProps {
  onBack: () => void
}

interface CertificateValidation {
  valid: boolean
  issued_by_ca: boolean
  signature_valid: boolean
  exists_in_database: boolean
  revoked: boolean
  expired: boolean
  not_yet_valid: boolean
  serial_number?: string
  fingerprint?: string
  subject?: string
  issuer?: string
  algorithm?: string
  ca_algorithm?: string
  issued_at?: string
  expires_at?: string
}

type ValidationState = 'idle' | 'validating' | 'success' | 'error'

export function ValidateStandaloneCertificatePage({ onBack }: ValidateStandaloneCertificatePageProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [certificateFile, setCertificateFile] = useState<File | null>(null)
  const [state, setState] = useState<ValidationState>('idle')
  const [result, setResult] = useState<CertificateValidation | null>(null)
  const [error, setError] = useState('')

  const handleFile = (file: File | undefined) => {
    if (!file) return
    const lower = file.name.toLowerCase()
    if (!lower.endsWith('.crt') && !lower.endsWith('.pem') && !lower.endsWith('.cer')) {
      setError('Selecciona un certificado .crt, .pem o .cer.')
      setCertificateFile(null)
      return
    }
    setCertificateFile(file)
    setError('')
    setResult(null)
    setState('idle')
  }

  const validateCertificate = async () => {
    if (!certificateFile) {
      setError('Selecciona un certificado X.509.')
      return
    }

    setState('validating')
    setError('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('certificate', certificateFile)
      const response = await fetch('/api/ca/certificates/verify', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.detail || 'No fue posible validar el certificado.')
      setResult(data)
      setState('success')
    } catch (err) {
      setState('error')
      setError(err instanceof Error ? err.message : 'Ocurrió un error al validar el certificado.')
    }
  }

  const reset = () => {
    setCertificateFile(null)
    setResult(null)
    setError('')
    setState('idle')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0f5fe' }}>
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8">
          <button type="button" onClick={onBack} className="mono text-xs mb-5" style={{ color: '#3b6fd4' }}>← Volver</button>
          <p className="mono text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#10b981' }}>Verificación</p>
          <h1 className="text-3xl font-semibold" style={{ color: '#0a1628' }}>Validar certificado</h1>
          <p className="mt-2 text-sm" style={{ color: '#3b6fd4' }}>
            Verifica un certificado X.509 ECDSA o ML-DSA directamente, sin necesidad de subir un PDF.
          </p>
        </div>

        {error && <div className="mb-6 rounded-xl p-4" style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3', color: '#991b1b' }}>{error}</div>}

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #dce8fd' }}>
            <div
              onClick={() => fileRef.current?.click()}
              className="rounded-xl p-8 text-center cursor-pointer"
              style={{ border: '2px dashed #bfd2f4', backgroundColor: '#f8fbff' }}
            >
              <input ref={fileRef} type="file" accept=".crt,.pem,.cer,application/x-pem-file" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
              <FileIcon className="w-10 h-10 mx-auto mb-3" style={{ color: '#2450a4' }} />
              <p className="font-semibold" style={{ color: '#0a1628' }}>{certificateFile?.name ?? 'Seleccionar certificado'}</p>
              <p className="text-xs mt-1" style={{ color: '#6b98e8' }}>.crt · .pem · .cer</p>
            </div>

            <button type="button" onClick={validateCertificate} disabled={!certificateFile || state === 'validating'} className="w-full mt-5 py-3 rounded-xl font-semibold" style={{ backgroundColor: certificateFile ? '#0a1628' : '#c7d8f5', color: 'white' }}>
              {state === 'validating' ? 'Verificando...' : 'Verificar certificado en SignPDF CA'}
            </button>
            {certificateFile && <button type="button" onClick={reset} className="w-full mt-2 py-2 text-xs" style={{ color: '#6b98e8' }}>Seleccionar otro certificado</button>}
          </div>

          <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #dce8fd' }}>
            {!result ? (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center">
                <ShieldIcon className="w-12 h-12 mb-4" style={{ color: '#bfd2f4' }} />
                <p className="text-sm" style={{ color: '#6b98e8' }}>El estado del certificado aparecerá aquí.</p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  {result.valid ? <CheckIcon className="w-7 h-7" style={{ color: '#059669' }} /> : <LockIcon className="w-7 h-7" style={{ color: '#dc2626' }} />}
                  <div>
                    <h2 className="font-semibold" style={{ color: result.valid ? '#166534' : '#991b1b' }}>
                      {result.valid ? 'Certificado válido' : 'Certificado no válido'}
                    </h2>
                    <p className="text-xs" style={{ color: '#6b98e8' }}>{result.ca_algorithm || result.algorithm || 'X.509'}</p>
                  </div>
                </div>

                <ResultRow label="Firma del certificado" ok={result.signature_valid} />
                <ResultRow label="Emitido por SignPDF CA" ok={result.issued_by_ca} />
                <ResultRow label="Existe en la base de la CA" ok={result.exists_in_database} />
                <ResultRow label="No revocado" ok={!result.revoked} />
                <ResultRow label="No expirado" ok={!result.expired} />
                <ResultRow label="Ya vigente" ok={!result.not_yet_valid} />

                <div className="mt-5 rounded-xl p-4" style={{ backgroundColor: '#f8fbff', border: '1px solid #dce8fd' }}>
                  <p className="text-xs break-all" style={{ color: '#162c5e' }}><strong>Sujeto:</strong> {result.subject || '—'}</p>
                  <p className="text-xs break-all mt-2" style={{ color: '#162c5e' }}><strong>Emisor:</strong> {result.issuer || '—'}</p>
                  <p className="text-xs break-all mt-2" style={{ color: '#162c5e' }}><strong>Serial:</strong> {result.serial_number || '—'}</p>
                  <p className="text-xs break-all mt-2" style={{ color: '#162c5e' }}><strong>Fingerprint:</strong> {result.fingerprint || '—'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ResultRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: '#edf3ff' }}>
      <span className="text-sm" style={{ color: '#3b4f72' }}>{label}</span>
      <span className="text-xs font-semibold" style={{ color: ok ? '#059669' : '#dc2626' }}>{ok ? 'OK' : 'FALLA'}</span>
    </div>
  )
}
