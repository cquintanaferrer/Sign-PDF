import { useState, useEffect } from 'react'
import { ShieldIcon, LockIcon } from './icons'

interface Certificate {
  id: number
  request_id: string
  status: string
  signed_certificate: string | null
}

interface DashboardScreenProps {
  userName: string
  token: string
  onNewRequest: () => void
}

export function DashboardScreen({ userName, token, onNewRequest }: DashboardScreenProps) {
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCertificates = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/certificates/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setCertificates(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCertificates()
  }, [])

  const checkStatus = async (certId: number) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/certificates/${certId}/status`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        // Actualizar la lista
        fetchCertificates()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const downloadCert = (certText: string) => {
    const blob = new Blob([certText], { type: 'application/x-pem-file' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'certificado.crt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const firstName = userName.split(' ')[0]

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#f8fafc' }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#0f172a' }}>Panel de Certificados</h1>
            <p className="text-sm" style={{ color: '#64748b' }}>Bienvenido, {firstName}</p>
          </div>
          <button
            onClick={onNewRequest}
            className="px-4 py-2 rounded-lg font-semibold text-white transition-all duration-200"
            style={{ backgroundColor: '#0a1628' }}
          >
            + Nuevo Certificado
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10"><p>Cargando...</p></div>
        ) : certificates.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-slate-200">
            <ShieldIcon className="w-12 h-12 mx-auto mb-3" style={{ color: '#cbd5e1' }} />
            <p className="text-slate-500">No tienes certificados aún.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {certificates.map(cert => (
              <div key={cert.id} className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-800">Certificado #{cert.id}</span>
                    {cert.status === 'PENDING' ? (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">Pendiente</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">Emitido</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-mono">Req ID: {cert.request_id || 'N/A'}</p>
                </div>
                
                <div className="flex gap-2">
                  {cert.status === 'PENDING' && (
                    <button
                      onClick={() => checkStatus(cert.id)}
                      className="px-4 py-2 rounded text-sm font-medium transition-colors bg-blue-50 text-blue-700 hover:bg-blue-100"
                    >
                      Consultar Estado
                    </button>
                  )}
                  {cert.status === 'ISSUED' && cert.signed_certificate && (
                    <button
                      onClick={() => downloadCert(cert.signed_certificate!)}
                      className="px-4 py-2 rounded text-sm font-medium transition-colors bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex items-center gap-1"
                    >
                      <LockIcon className="w-4 h-4" />
                      Descargar .crt
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
