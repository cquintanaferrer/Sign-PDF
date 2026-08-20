import { useCallback, useEffect, useState } from 'react'
import {
  createCsrFromProtectedKeys,
  detectPublicKeyAlgorithm,
  type ClientAlgorithm,
} from '../crypto'
import { CheckIcon, DownloadIcon, LockIcon, ShieldIcon } from './icons'

interface CertificatePageProps {
  userName: string
  userEmail: string
  token: string
}

interface CertificateData {
  id: string
  status: string
  requester_username?: string
  username?: string
  email?: string
  serial_number?: string
  subject?: string
  issuer?: string
  algorithm?: string
  created_at?: string
  processed_at?: string
  issued_at?: string
  expires_at?: string
  certificate?: string
  certificate_status?: string
  revoked_at?: string | null
  revocation_reason?: string | null
}

const API_URL = '/api/csr'

function labelFor(algorithm: ClientAlgorithm | null) {
  if (algorithm === 'ECDSA_P256') return 'ECDSA P-256 / SHA-256'
  if (algorithm === 'ML_DSA_65') return 'ML-DSA-65'
  return 'Algoritmo por detectar'
}

function effectiveStatus(item: CertificateData) {
  if (item.certificate_status === 'REVOKED') return 'REVOKED'
  return item.status || 'PENDING'
}

function statusColor(status: string) {
  if (status === 'ISSUED') return '#059669'
  if (status === 'REVOKED') return '#dc2626'
  return '#b45309'
}

export function CertificatePage({ userName, userEmail, token }: CertificatePageProps) {
  const [privateKeyFile, setPrivateKeyFile] = useState<File | null>(null)
  const [publicKeyFile, setPublicKeyFile] = useState<File | null>(null)
  const [keyPassword, setKeyPassword] = useState('')
  const [algorithm, setAlgorithm] = useState<ClientAlgorithm | null>(null)
  const [records, setRecords] = useState<CertificateData[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')

  const refreshRecords = useCallback(async (silent = false) => {
    if (!token) return
    if (!silent) setChecking(true)
    try {
      const response = await fetch('/client-api/certificates/ca-records', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.detail || 'No fue posible consultar tus solicitudes en la CA.')
      setRecords(Array.isArray(data) ? data : [])
      if (!silent) setError('')
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'No fue posible consultar tus certificados.')
      }
    } finally {
      if (!silent) setChecking(false)
    }
  }, [token])

  useEffect(() => {
    void refreshRecords()
  }, [refreshRecords, userEmail])

  useEffect(() => {
    const hasPending = records.some(item => effectiveStatus(item) === 'PENDING')
    if (!hasPending) return

    const timer = window.setInterval(() => {
      void refreshRecords(true)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [records, refreshRecords])

  const handlePublicKey = async (file: File | undefined) => {
    if (!file) return
    setPublicKeyFile(file)
    setError('')
    try {
      setAlgorithm(detectPublicKeyAlgorithm(await file.text()))
    } catch (err) {
      setAlgorithm(null)
      setError(err instanceof Error ? err.message : 'No se pudo detectar el algoritmo de la llave pública.')
    }
  }

  const submitCertificateRequest = async () => {
    if (!privateKeyFile || !publicKeyFile) {
      setError('Selecciona la llave privada protegida y la llave pública.')
      return
    }
    if (!keyPassword) {
      setError('Escribe la contraseña de la llave privada.')
      return
    }
    if (!userEmail) {
      setError('No fue posible obtener el correo del usuario autenticado.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const privatePem = await privateKeyFile.text()
      const publicPem = await publicKeyFile.text()
      const result = await createCsrFromProtectedKeys(
        privatePem,
        keyPassword,
        publicPem,
        { commonName: userName || userEmail, email: userEmail },
      )
      setAlgorithm(result.algorithm)

      const formData = new FormData()
      formData.append(
        'csr',
        new Blob([result.csrPem], { type: 'application/pkcs10' }),
        result.algorithm === 'ECDSA_P256' ? 'ecdsa_request.csr' : 'mldsa65_request.csr',
      )

      const response = await fetch(API_URL, { method: 'POST', body: formData })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.detail || 'No fue posible enviar la CSR a la CA.')

      setKeyPassword('')
      setPrivateKeyFile(null)
      setPublicKeyFile(null)
      await refreshRecords(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible crear la solicitud.')
    } finally {
      setSubmitting(false)
    }
  }

  const downloadCertificate = (certificate: CertificateData) => {
    if (!certificate.certificate) return
    const blob = new Blob([certificate.certificate], { type: 'application/x-pem-file' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const algo = certificate.algorithm?.toLowerCase().includes('ml-dsa') ? 'mldsa65' : 'ecdsa'
    link.download = `${algo}_certificate-${certificate.serial_number ?? certificate.id}.crt`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0f5fe' }}>
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-8">
          <p className="mono text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#10b981' }}>Certificados</p>
          <h1 className="text-3xl font-semibold" style={{ color: '#0a1628' }}>Solicitar certificado</h1>
          <p className="mt-2 text-sm" style={{ color: '#3b6fd4' }}>
            Crea la CSR ECDSA o ML-DSA-65 localmente. Solo la CSR se envía a la CA. Tus solicitudes se consultan automáticamente al entrar.
          </p>
        </div>

        {error && <div className="mb-6 rounded-xl p-4" style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3', color: '#991b1b' }}>{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #dce8fd' }}>
            <div className="flex items-center gap-3 mb-6">
              <ShieldIcon className="w-6 h-6" style={{ color: '#2450a4' }} />
              <div>
                <h2 className="font-semibold" style={{ color: '#0a1628' }}>{labelFor(algorithm)}</h2>
                <p className="text-xs" style={{ color: '#6b98e8' }}>Se detecta desde la llave pública.</p>
              </div>
            </div>

            <label className="block text-sm font-semibold mb-2" style={{ color: '#162c5e' }}>Llave privada protegida</label>
            <input
              type="file"
              accept=".pem,.key"
              onChange={e => setPrivateKeyFile(e.target.files?.[0] ?? null)}
              className="w-full mb-4 text-sm rounded-xl p-3"
              style={{ border: '1px solid #dce8fd' }}
            />

            <label className="block text-sm font-semibold mb-2" style={{ color: '#162c5e' }}>Llave pública</label>
            <input
              type="file"
              accept=".pem,.pub"
              onChange={e => void handlePublicKey(e.target.files?.[0])}
              className="w-full mb-4 text-sm rounded-xl p-3"
              style={{ border: '1px solid #dce8fd' }}
            />

            <label className="block text-sm font-semibold mb-2" style={{ color: '#162c5e' }}>Contraseña de la llave privada</label>
            <input
              type="password"
              value={keyPassword}
              onChange={e => setKeyPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Contraseña usada al descargar la llave"
              className="w-full mb-5 rounded-xl px-4 py-3 text-sm outline-none"
              style={{ border: '1px solid #dce8fd' }}
            />

            <button
              type="button"
              disabled={submitting}
              onClick={submitCertificateRequest}
              className="w-full py-3 rounded-xl font-semibold text-sm"
              style={{ backgroundColor: submitting ? '#c7d8f5' : '#0a1628', color: 'white' }}
            >
              {submitting ? 'Creando y enviando CSR...' : 'Crear CSR y solicitar certificado'}
            </button>

            <div className="mt-5 rounded-xl p-4 flex gap-3" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <LockIcon className="w-5 h-5" style={{ color: '#059669' }} />
              <p className="text-xs leading-relaxed" style={{ color: '#166534' }}>
                La llave privada y su contraseña se usan exclusivamente en el navegador. La CA recibe únicamente la CSR PKCS#10.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #dce8fd' }}>
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="font-semibold" style={{ color: '#0a1628' }}>Mis solicitudes y certificados</h2>
                <p className="text-xs mt-1" style={{ color: '#6b98e8' }}>
                  Se consulta al abrir esta pestaña y cada 5 s mientras exista una solicitud pendiente.
                </p>
              </div>
              {checking && <span className="mono text-[10px]" style={{ color: '#3b6fd4' }}>ACTUALIZANDO…</span>}
            </div>

            {!checking && records.length === 0 ? (
              <div className="min-h-[260px] flex flex-col items-center justify-center text-center">
                <ShieldIcon className="w-10 h-10 mb-3" style={{ color: '#bfd2f4' }} />
                <p className="text-sm" style={{ color: '#6b98e8' }}>Todavía no hay solicitudes asociadas a {userEmail}.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[620px] overflow-y-auto pr-1">
                {records.map(item => {
                  const status = effectiveStatus(item)
                  return (
                    <div key={item.id} className="rounded-xl p-4" style={{ backgroundColor: '#f8fbff', border: '1px solid #dce8fd' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-sm" style={{ color: '#0a1628' }}>{item.algorithm || 'Algoritmo'}</p>
                          <p className="mono text-[10px] break-all mt-1" style={{ color: '#6b98e8' }}>{item.id}</p>
                        </div>
                        <span className="mono text-[10px] font-semibold px-2 py-1 rounded" style={{ color: statusColor(status), backgroundColor: `${statusColor(status)}12` }}>
                          {status}
                        </span>
                      </div>

                      {item.subject && <p className="text-xs break-all mt-3" style={{ color: '#3f587f' }}>{item.subject}</p>}
                      {item.issued_at && <p className="text-[11px] mt-2" style={{ color: '#6b98e8' }}>Emitido: {new Date(item.issued_at).toLocaleString('es-MX')}</p>}
                      {item.expires_at && <p className="text-[11px] mt-1" style={{ color: '#6b98e8' }}>Vence: {new Date(item.expires_at).toLocaleString('es-MX')}</p>}

                      {item.certificate && status !== 'REVOKED' && (
                        <button
                          type="button"
                          onClick={() => downloadCertificate(item)}
                          className="w-full mt-4 py-2.5 rounded-lg text-sm font-semibold flex gap-2 items-center justify-center"
                          style={{ backgroundColor: '#059669', color: 'white' }}
                        >
                          <DownloadIcon className="w-4 h-4" /> Descargar certificado {item.algorithm?.includes('ML-DSA') ? 'ML-DSA' : 'ECDSA'}
                        </button>
                      )}

                      {status === 'PENDING' && (
                        <p className="text-xs mt-3" style={{ color: '#b45309' }}>Esperando emisión en la CA. No necesitas pulsar ningún botón para actualizar.</p>
                      )}

                      {status === 'REVOKED' && (
                        <p className="text-xs mt-3" style={{ color: '#991b1b' }}>{item.revocation_reason || 'Certificado revocado por la CA.'}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
