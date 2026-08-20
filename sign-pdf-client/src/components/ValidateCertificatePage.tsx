import { useRef, useState } from 'react'
import { CheckIcon, FileIcon, LockIcon, ShieldIcon } from './icons'

interface ValidateCertificatePageProps {
  token: string
  onBack: () => void
}

interface PdfValidation {
  intact: boolean
  signature_valid: boolean
  trusted_locally: boolean
  signature_mechanism?: string | null
  digest_algorithm?: string | null
  signature_count: number
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

interface ValidationResponse {
  success: boolean
  valid: boolean
  pdf_signature: PdfValidation
  certificate: CertificateValidation
}

type ValidationState = 'idle' | 'validating' | 'success' | 'error'

export function ValidateCertificatePage({ token, onBack }: ValidateCertificatePageProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [state, setState] = useState<ValidationState>('idle')
  const [result, setResult] = useState<ValidationResponse | null>(null)
  const [error, setError] = useState('')

  const handleFileChange = (file: File | undefined) => {
    if (!file) return
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Selecciona un archivo PDF.')
      setPdfFile(null)
      return
    }
    setPdfFile(file)
    setError('')
    setResult(null)
    setState('idle')
  }

  const validatePdf = async () => {
    if (!pdfFile) {
      setError('Selecciona un PDF firmado.')
      return
    }
    if (!token) {
      setError('No existe una sesión autenticada.')
      return
    }

    setState('validating')
    setError('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('pdf', pdfFile)
      const response = await fetch('/client-api/signatures/verify-pdf', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.detail || 'No fue posible validar el PDF.')
      setResult(data)
      setState('success')
    } catch (err) {
      setState('error')
      setError(err instanceof Error ? err.message : 'Ocurrió un error al validar el PDF.')
    }
  }

  const reset = () => {
    setPdfFile(null)
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
          <h1 className="text-3xl font-semibold" style={{ color: '#0a1628' }}>Validar PDF firmado</h1>
          <p className="mt-2 text-sm" style={{ color: '#3b6fd4' }}>
            Solo necesitas el PDF firmado. SignPDF verifica la firma ECDSA o ML-DSA, la integridad del documento y el certificado incluido en CMS.
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
              <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={e => handleFileChange(e.target.files?.[0])} />
              <FileIcon className="w-10 h-10 mx-auto mb-3" style={{ color: '#2450a4' }} />
              <p className="font-semibold" style={{ color: '#0a1628' }}>{pdfFile?.name ?? 'Seleccionar PDF firmado'}</p>
            </div>

            <button type="button" onClick={validatePdf} disabled={!pdfFile || state === 'validating'} className="w-full mt-5 py-3 rounded-xl font-semibold" style={{ backgroundColor: pdfFile ? '#0a1628' : '#c7d8f5', color: 'white' }}>
              {state === 'validating' ? 'Verificando...' : 'Verificar firma y certificado'}
            </button>
            {pdfFile && <button type="button" onClick={reset} className="w-full mt-2 py-2 text-xs" style={{ color: '#6b98e8' }}>Seleccionar otro archivo</button>}
          </div>

          <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #dce8fd' }}>
            {!result ? (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center">
                <ShieldIcon className="w-12 h-12 mb-4" style={{ color: '#bfd2f4' }} />
                <p className="text-sm" style={{ color: '#6b98e8' }}>El resultado criptográfico y de confianza aparecerá aquí.</p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  {result.valid ? <CheckIcon className="w-7 h-7" style={{ color: '#059669' }} /> : <LockIcon className="w-7 h-7" style={{ color: '#dc2626' }} />}
                  <div>
                    <h2 className="font-semibold" style={{ color: result.valid ? '#166534' : '#991b1b' }}>
                      {result.valid ? 'PDF válido' : 'PDF no válido'}
                    </h2>
                    <p className="text-xs" style={{ color: '#6b98e8' }}>{result.certificate.ca_algorithm || result.certificate.algorithm}</p>
                  </div>
                </div>

                <ResultRow label="ByteRange / integridad" ok={result.pdf_signature.intact} />
                <ResultRow label="Firma matemática del PDF" ok={result.pdf_signature.signature_valid} />
                <ResultRow label="Certificado válido en SignPDF CA" ok={result.certificate.valid} />
                <ResultRow label="Certificado emitido por la CA" ok={result.certificate.issued_by_ca} />
                <ResultRow label="No revocado" ok={!result.certificate.revoked} />
                <ResultRow label="No expirado" ok={!result.certificate.expired} />

                <div className="mt-5 rounded-xl p-4" style={{ backgroundColor: '#f8fbff', border: '1px solid #dce8fd' }}>
                  <p className="text-xs break-all" style={{ color: '#162c5e' }}><strong>Sujeto:</strong> {result.certificate.subject}</p>
                  <p className="text-xs break-all mt-2" style={{ color: '#162c5e' }}><strong>Emisor:</strong> {result.certificate.issuer}</p>
                  <p className="text-xs mt-2" style={{ color: '#162c5e' }}><strong>Firma PDF:</strong> {result.pdf_signature.signature_mechanism || 'detectada por pyHanko'}</p>
                  <p className="text-xs mt-2" style={{ color: '#162c5e' }}><strong>Digest CMS:</strong> {result.pdf_signature.digest_algorithm || '—'}</p>
                  <p className="text-xs mt-2" style={{ color: '#162c5e' }}><strong>Firmas encontradas:</strong> {result.pdf_signature.signature_count}</p>
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
