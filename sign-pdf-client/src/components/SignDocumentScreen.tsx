import { useCallback, useRef, useState } from 'react'
import {
  base64ToBytes,
  bytesToBase64,
  signCmsAttributesLocally,
  type ClientAlgorithm,
} from '../crypto'
import { CheckIcon, DownloadIcon, FileIcon, LockIcon, ShieldIcon } from './icons'

interface SignDocumentScreenProps {
  userName: string
  userEmail: string
  token: string
  onBack: () => void
}

type SignState = 'idle' | 'ready' | 'signing' | 'signed' | 'error'

type PrepareResponse = {
  operation_id: string
  algorithm: ClientAlgorithm
  algorithm_label: string
  digest_algorithm: string
  to_sign_b64: string
  expires_in_seconds: number
}

interface SelectedFile {
  file: File
  name: string
  size: number
}

function selectedFile(file: File): SelectedFile {
  return { file, name: file.name, size: file.size }
}

export function SignDocumentScreen({
  userName,
  userEmail,
  token,
  onBack,
}: SignDocumentScreenProps) {
  const [signState, setSignState] = useState<SignState>('idle')
  const [isDragging, setIsDragging] = useState(false)
  const [pdfFile, setPdfFile] = useState<SelectedFile | null>(null)
  const [privateKeyFile, setPrivateKeyFile] = useState<SelectedFile | null>(null)
  const [certificateFile, setCertificateFile] = useState<SelectedFile | null>(null)
  const [keyPassword, setKeyPassword] = useState('')
  const [signedPdf, setSignedPdf] = useState<Blob | null>(null)
  const [signedFileName, setSignedFileName] = useState('signed-document.pdf')
  const [usedAlgorithm, setUsedAlgorithm] = useState('')
  const [error, setError] = useState('')

  const pdfInputRef = useRef<HTMLInputElement>(null)
  const privateKeyInputRef = useRef<HTMLInputElement>(null)
  const certificateInputRef = useRef<HTMLInputElement>(null)

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const loadPdf = useCallback((file: File) => {
    setError('')
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('El archivo seleccionado no es un PDF.')
      return
    }
    setPdfFile(selectedFile(file))
    setSignedPdf(null)
    setSignState('ready')
  }, [])

  const handlePrivateKey = (file: File | undefined) => {
    if (!file) return
    if (!/\.(pem|key)$/i.test(file.name)) {
      setError('La llave privada debe ser un archivo PEM o KEY.')
      return
    }
    setPrivateKeyFile(selectedFile(file))
    setError('')
  }

  const handleCertificate = (file: File | undefined) => {
    if (!file) return
    if (!/\.(pem|crt|cer)$/i.test(file.name)) {
      setError('El certificado debe ser PEM, CRT o CER.')
      return
    }
    setCertificateFile(selectedFile(file))
    setError('')
  }

  const handleSign = async () => {
    if (!pdfFile || !privateKeyFile || !certificateFile) {
      setError('Selecciona el PDF, la llave privada protegida y el certificado.')
      return
    }
    if (!keyPassword) {
      setError('Escribe la contraseña de la llave privada.')
      return
    }
    if (!token) {
      setError('No existe una sesión autenticada.')
      return
    }

    setError('')
    setSignState('signing')
    setSignedPdf(null)

    try {
      // Fase 1: el backend prepara ByteRange + CMS SignedAttributes.
      // La llave privada NO se adjunta a esta petición.
      const prepareForm = new FormData()
      prepareForm.append('pdf', pdfFile.file, pdfFile.name)
      prepareForm.append('certificate', certificateFile.file, certificateFile.name)

      const prepareResponse = await fetch('/client-api/signatures/prepare-pdf', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: prepareForm,
      })
      const prepared = (await prepareResponse.json()) as PrepareResponse & { detail?: string }
      if (!prepareResponse.ok) throw new Error(prepared.detail || 'No fue posible preparar el PDF.')

      // Fase 2: descifrado y firma criptográfica LOCAL en el navegador.
      const encryptedPrivatePem = await privateKeyFile.file.text()
      const signature = await signCmsAttributesLocally(
        encryptedPrivatePem,
        keyPassword,
        prepared.algorithm,
        base64ToBytes(prepared.to_sign_b64),
      )

      // Fase 3: solo vuelve al backend la firma. pyHanko completa CMS/PAdES.
      const finalizeResponse = await fetch('/client-api/signatures/finalize-pdf', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation_id: prepared.operation_id,
          signature_b64: bytesToBase64(signature),
        }),
      })

      if (!finalizeResponse.ok) {
        const data = await finalizeResponse.json().catch(() => null)
        throw new Error(data?.detail || 'No fue posible completar la firma del PDF.')
      }

      const blob = await finalizeResponse.blob()
      if (!blob.size) throw new Error('El servidor devolvió un PDF vacío.')

      const baseName = pdfFile.name.replace(/\.pdf$/i, '').trim() || 'document'
      setSignedFileName(`${baseName}-signed.pdf`)
      setSignedPdf(blob)
      setUsedAlgorithm(prepared.algorithm_label)
      setKeyPassword('')
      setSignState('signed')
    } catch (err) {
      console.error('Error al firmar PDF:', err)
      setError(err instanceof Error ? err.message : 'No fue posible firmar el PDF.')
      setSignState('error')
    }
  }

  const handleDownload = () => {
    if (!signedPdf) return
    const url = URL.createObjectURL(signedPdf)
    const link = document.createElement('a')
    link.href = url
    link.download = signedFileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const canSign = !!pdfFile && !!privateKeyFile && !!certificateFile && !!keyPassword && signState !== 'signing'

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0f5fe' }}>
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-8">
          <button type="button" onClick={onBack} className="mono text-xs mb-5" style={{ color: '#3b6fd4' }}>← Inicio</button>
          <p className="mono text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#10b981' }}>Firma de documentos</p>
          <h1 className="text-3xl font-semibold" style={{ color: '#0a1628' }}>Firmar PDF</h1>
          <p className="mt-2 text-sm" style={{ color: '#3b6fd4' }}>
            ECDSA P-256 y ML-DSA-65 con firma local. El backend prepara e incrusta CMS/PAdES, pero nunca recibe tu llave privada ni su contraseña.
          </p>
        </div>

        {error && <div className="mb-6 rounded-xl p-4" style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3', color: '#991b1b' }}>{error}</div>}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) loadPdf(f) }}
              onClick={() => pdfInputRef.current?.click()}
              className="bg-white rounded-2xl p-8 text-center cursor-pointer"
              style={{ border: `2px dashed ${isDragging ? '#2450a4' : '#bfd2f4'}` }}
            >
              <input ref={pdfInputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) loadPdf(f) }} />
              <FileIcon className="w-10 h-10 mx-auto mb-3" style={{ color: '#2450a4' }} />
              <p className="font-semibold" style={{ color: '#0a1628' }}>{pdfFile ? pdfFile.name : 'Seleccionar PDF'}</p>
              <p className="text-xs mt-1" style={{ color: '#6b98e8' }}>{pdfFile ? formatSize(pdfFile.size) : 'Arrastra el documento o haz clic aquí'}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <FileSelector
                title="Llave privada protegida"
                description="ENCRYPTED PRIVATE KEY PEM"
                file={privateKeyFile}
                onClick={() => privateKeyInputRef.current?.click()}
              >
                <input ref={privateKeyInputRef} type="file" accept=".pem,.key" className="hidden" onChange={e => handlePrivateKey(e.target.files?.[0])} />
              </FileSelector>
              <FileSelector
                title="Certificado del firmante"
                description="X.509 PEM/CRT"
                file={certificateFile}
                onClick={() => certificateInputRef.current?.click()}
              >
                <input ref={certificateInputRef} type="file" accept=".pem,.crt,.cer" className="hidden" onChange={e => handleCertificate(e.target.files?.[0])} />
              </FileSelector>
            </div>

            <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #dce8fd' }}>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#162c5e' }}>Contraseña de la llave privada</label>
              <input
                type="password"
                value={keyPassword}
                onChange={e => setKeyPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{ border: '1px solid #c7d8f5' }}
                placeholder="La misma contraseña usada al descargar la llave"
              />
              <p className="text-xs mt-2" style={{ color: '#059669' }}>Esta contraseña no se envía en ninguna petición HTTP.</p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #dce8fd' }}>
              <ShieldIcon className="w-7 h-7 mb-3" style={{ color: '#2450a4' }} />
              <h2 className="font-semibold" style={{ color: '#0a1628' }}>Firma local</h2>
              <p className="text-xs mt-2 leading-relaxed" style={{ color: '#6b98e8' }}>
                El certificado determina automáticamente si la operación usa ECDSA P-256 o ML-DSA-65. Solo los atributos CMS preparados se firman en este navegador.
              </p>
              <div className="mt-4 text-xs space-y-1" style={{ color: '#3b6fd4' }}>
                <p>Usuario: {userName || userEmail}</p>
                <p>Llave privada: nunca sale del cliente</p>
                <p>Contraseña: nunca sale del cliente</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSign}
              disabled={!canSign}
              className="w-full py-4 rounded-xl font-semibold"
              style={{ backgroundColor: canSign ? '#0a1628' : '#c7d8f5', color: 'white' }}
            >
              {signState === 'signing' ? 'Firmando localmente...' : 'Firmar PDF'}
            </button>

            {signState === 'signed' && signedPdf && (
              <div className="rounded-2xl p-5" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <div className="flex items-center gap-2 mb-2"><CheckIcon className="w-5 h-5" style={{ color: '#059669' }} /><strong style={{ color: '#166534' }}>PDF firmado</strong></div>
                <p className="text-xs mb-4" style={{ color: '#166534' }}>{usedAlgorithm}</p>
                <button type="button" onClick={handleDownload} className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2" style={{ backgroundColor: '#059669', color: 'white' }}>
                  <DownloadIcon className="w-4 h-4" /> Descargar PDF firmado
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function FileSelector({
  title,
  description,
  file,
  onClick,
  children,
}: {
  title: string
  description: string
  file: SelectedFile | null
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <div onClick={onClick} className="bg-white rounded-2xl p-5 cursor-pointer" style={{ border: '1px solid #dce8fd' }}>
      {children}
      <div className="flex gap-3 items-start">
        <LockIcon className="w-5 h-5 mt-0.5" style={{ color: '#2450a4' }} />
        <div>
          <p className="font-semibold text-sm" style={{ color: '#0a1628' }}>{title}</p>
          <p className="text-xs mt-1" style={{ color: '#6b98e8' }}>{file ? file.name : description}</p>
        </div>
      </div>
    </div>
  )
}
