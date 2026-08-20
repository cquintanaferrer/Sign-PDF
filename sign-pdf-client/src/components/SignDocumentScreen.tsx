import { useState, useRef, useCallback } from 'react'
import {
  CheckIcon,
  LockIcon,
  DownloadIcon,
  ShieldIcon,
  FileIcon,
} from './icons'

type Algorithm = 'ECDSA_P256' | 'ML_DSA_65'

type SignState =
  | 'idle'
  | 'ready'
  | 'signing'
  | 'signed'
  | 'error'

interface SignDocumentScreenProps {
  algorithm: Algorithm
  userName: string
  userEmail: string
  certSerial: string
  token: string
  onBack: () => void
}

interface SelectedFile {
  file: File
  name: string
  size: number
}


export function SignDocumentScreen({
  algorithm,
  userName,
  userEmail,
  certSerial,
  token,
  onBack,
}: SignDocumentScreenProps) {
  const [signState, setSignState] =
    useState<SignState>('idle')

  const [isDragging, setIsDragging] =
    useState(false)

  const [pdfFile, setPdfFile] =
    useState<SelectedFile | null>(null)

  const [privateKeyFile, setPrivateKeyFile] =
    useState<SelectedFile | null>(null)

  const [certificateFile, setCertificateFile] =
    useState<SelectedFile | null>(null)

  const [signedPdf, setSignedPdf] =
    useState<Blob | null>(null)

  const [signedFileName, setSignedFileName] =
    useState('signed-document.pdf')

  const [error, setError] =
    useState('')

  const [signedCount, setSignedCount] =
    useState(0)

  const pdfInputRef =
    useRef<HTMLInputElement>(null)

  const privateKeyInputRef =
    useRef<HTMLInputElement>(null)

  const certificateInputRef =
    useRef<HTMLInputElement>(null)


  const algoLabel =
    algorithm === 'ECDSA_P256'
      ? 'ECDSA P-256 / SHA-256'
      : 'ML-DSA-65'


  // =========================================================
  // FILE HELPERS
  // =========================================================

  const formatSize = (bytes: number) => {
    if (bytes < 1024) {
      return `${bytes} B`
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }


  const createSelectedFile = (
    file: File,
  ): SelectedFile => ({
    file,
    name: file.name,
    size: file.size,
  })


  // =========================================================
  // PDF
  // =========================================================

  const loadPdf = useCallback((file: File) => {
    setError('')

    if (
      file.type !== 'application/pdf' &&
      !file.name.toLowerCase().endsWith('.pdf')
    ) {
      setError('El archivo seleccionado no es un PDF.')
      return
    }

    setPdfFile(createSelectedFile(file))
    setSignedPdf(null)
    setSignState('ready')
  }, [])


  const handlePdfInput = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0]

    if (file) {
      loadPdf(file)
    }
  }


  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
  ) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]

    if (file) {
      loadPdf(file)
    }
  }


  // =========================================================
  // PRIVATE KEY
  // =========================================================

  const handlePrivateKeyInput = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0]

    if (!file) return

    setError('')

    const validExtension =
      file.name.toLowerCase().endsWith('.pem') ||
      file.name.toLowerCase().endsWith('.key')

    if (!validExtension) {
      setError(
        'La clave privada debe ser un archivo PEM o KEY.',
      )
      return
    }

    setPrivateKeyFile(createSelectedFile(file))
  }


  // =========================================================
  // CERTIFICATE
  // =========================================================

  const handleCertificateInput = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0]

    if (!file) return

    setError('')

    const validExtension =
      file.name.toLowerCase().endsWith('.pem') ||
      file.name.toLowerCase().endsWith('.crt') ||
      file.name.toLowerCase().endsWith('.cer')

    if (!validExtension) {
      setError(
        'El certificado debe ser un archivo PEM, CRT o CER.',
      )
      return
    }

    setCertificateFile(createSelectedFile(file))
  }


  // =========================================================
  // VALIDATION
  // =========================================================

  const canSign =
    pdfFile !== null &&
    privateKeyFile !== null &&
    certificateFile !== null &&
    signState !== 'signing'


  // =========================================================
  // SIGN PDF
  // =========================================================

  const handleSign = async () => {
    if (!pdfFile) {
      setError('Selecciona el PDF que deseas firmar.')
      return
    }

    if (!privateKeyFile) {
      setError('Selecciona la clave privada del firmante.')
      return
    }

    if (!certificateFile) {
      setError('Selecciona el certificado del firmante.')
      return
    }

    if (!token) {
      setError(
        'No existe un token de autenticación válido.',
      )
      return
    }

    setError('')
    setSignState('signing')
    setSignedPdf(null)

    try {
      const formData = new FormData()

      formData.append(
        'pdf',
        pdfFile.file,
        pdfFile.name,
      )

      formData.append(
        'private_key',
        privateKeyFile.file,
        privateKeyFile.name,
      )

      formData.append(
        'certificate',
        certificateFile.file,
        certificateFile.name,
      )

      const response = await fetch(
        '/client-api/signatures/sign-pdf',
        {
          method: 'POST',

          headers: {
            Authorization: `Bearer ${token}`,
          },

          body: formData,
        },
      )


      if (!response.ok) {
        let message =
          'No fue posible firmar el PDF.'

        try {
          const data = await response.json()

          if (data?.detail) {
            message = data.detail
          }
        } catch {
          // La respuesta no era JSON.
        }

        throw new Error(message)
      }


      const blob = await response.blob()

      if (!blob.size) {
        throw new Error(
          'El servidor devolvió un PDF vacío.',
        )
      }


      setSignedPdf(blob)

      const originalName =
        pdfFile.file.name

      const baseName =
        originalName
          .replace(/\.pdf$/i, '')
          .trim() || 'document'

      setSignedFileName(
        `${baseName}-signed.pdf`,
      )

      setSignedCount(count => count + 1)
      setSignState('signed')

    } catch (err) {
      console.error(
        'Error al firmar PDF:',
        err,
      )

      setError(
        err instanceof Error
          ? err.message
          : 'No fue posible firmar el PDF.',
      )

      setSignState('error')
    }
  }


  // =========================================================
  // DOWNLOAD SIGNED PDF
  // =========================================================

  const handleDownload = () => {
    if (!signedPdf) return

    const url =
      URL.createObjectURL(signedPdf)

    const link =
      document.createElement('a')

    link.href = url
    link.download = signedFileName

    document.body.appendChild(link)
    link.click()

    link.remove()

    URL.revokeObjectURL(url)
  }


  // =========================================================
  // RESET
  // =========================================================

  const handleReset = () => {
    setPdfFile(null)
    setPrivateKeyFile(null)
    setCertificateFile(null)
    setSignedPdf(null)
    setSignedFileName('signed-document.pdf')
    setError('')
    setSignState('idle')

    if (pdfInputRef.current) {
      pdfInputRef.current.value = ''
    }

    if (privateKeyInputRef.current) {
      privateKeyInputRef.current.value = ''
    }

    if (certificateInputRef.current) {
      certificateInputRef.current.value = ''
    }
  }


  // =========================================================
  // FILE CARD
  // =========================================================

  const FileCard = ({
    label,
    file,
    type,
    onSelect,
  }: {
    label: string
    file: SelectedFile | null
    type: 'pdf' | 'key' | 'certificate'
    onSelect: () => void
  }) => {
    return (
      <div
        className="rounded-xl p-4"
        style={{
          backgroundColor: '#f8fbff',
          border: '1px solid #dce8fd',
        }}
      >
        <div className="flex items-center gap-3">

          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor:
                type === 'pdf'
                  ? 'rgba(220,38,38,0.08)'
                  : type === 'key'
                    ? 'rgba(36,80,164,0.08)'
                    : 'rgba(16,185,129,0.08)',
            }}
          >
            {type === 'pdf' ? (
              <PdfIcon
                className="w-5 h-5"
                style={{ color: '#dc2626' }}
              />
            ) : type === 'key' ? (
              <LockIcon
                className="w-5 h-5"
                style={{ color: '#2450a4' }}
              />
            ) : (
              <ShieldIcon
                className="w-5 h-5"
                style={{ color: '#10b981' }}
              />
            )}
          </div>


          <div className="flex-1 min-w-0">

            <p
              className="mono text-[10px] uppercase tracking-wide mb-1"
              style={{ color: '#6b98e8' }}
            >
              {label}
            </p>

            {file ? (
              <>
                <p
                  className="text-sm font-medium truncate"
                  style={{ color: '#0a1628' }}
                  title={file.name}
                >
                  {file.name}
                </p>

                <p
                  className="mono text-[10px] mt-0.5"
                  style={{ color: '#6b98e8' }}
                >
                  {formatSize(file.size)}
                </p>
              </>
            ) : (
              <p
                className="text-xs"
                style={{ color: '#a8c4f4' }}
              >
                Archivo no seleccionado
              </p>
            )}
          </div>


          <button
            type="button"
            onClick={onSelect}
            className="mono text-[10px] px-3 py-2 rounded-lg flex-shrink-0"
            style={{
              color: '#2450a4',
              backgroundColor: 'white',
              border: '1px solid #c7d8f5',
            }}
          >
            {file ? 'Cambiar' : 'Seleccionar'}
          </button>

        </div>
      </div>
    )
  }


  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: '#f0f5fe',
      }}
    >

      {/* =====================================================
          HEADER
          ===================================================== */}

      <div
        className="w-full"
        style={{
          backgroundColor: '#0a1628',
          borderBottom:
            '1px solid rgba(100,160,255,0.1)',
        }}
      >
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">

          <button
            onClick={onBack}
            className="flex items-center gap-2 mono text-xs transition-colors"
            style={{
              color: '#6b98e8',
            }}
            onMouseEnter={e =>
              (e.currentTarget.style.color =
                '#a8c4f4')
            }
            onMouseLeave={e =>
              (e.currentTarget.style.color =
                '#6b98e8')
            }
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>

            Volver
          </button>


          <div className="flex items-center gap-3">

            {signedCount > 0 && (
              <div
                className="mono text-xs px-3 py-1.5 rounded-full"
                style={{
                  backgroundColor:
                    'rgba(16,185,129,0.15)',
                  color: '#34d399',
                  border:
                    '1px solid rgba(16,185,129,0.25)',
                }}
              >
                {signedCount} PDF
                {signedCount > 1 ? 's' : ''}{' '}
                firmado
                {signedCount > 1 ? 's' : ''}
              </div>
            )}

            <div
              className="mono text-xs"
              style={{
                color: '#3b6fd4',
              }}
            >
              {algoLabel}
            </div>

          </div>

        </div>
      </div>


      {/* =====================================================
          CONTENT
          ===================================================== */}

      <div className="max-w-5xl mx-auto px-6 py-10">

        <div className="mb-8">

          <p
            className="mono text-xs font-semibold tracking-widest uppercase mb-1"
            style={{
              color: '#10b981',
            }}
          >
            Firma Digital de Documentos
          </p>

          <h1
            className="text-2xl font-semibold mb-1"
            style={{
              color: '#0a1628',
            }}
          >
            Firmar documento PDF
          </h1>

          <p
            className="text-sm"
            style={{
              color: '#3b6fd4',
            }}
          >
            Selecciona el PDF, la clave privada y el
            certificado que utilizará el servicio de firma.
          </p>

        </div>


        {/* ===================================================
            ERROR
            =================================================== */}

        {error && (
          <div
            className="mb-6 rounded-xl px-4 py-3 flex items-start gap-3"
            style={{
              backgroundColor: 'rgba(220,38,38,0.06)',
              border:
                '1px solid rgba(220,38,38,0.20)',
            }}
          >
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: '#dc2626',
                color: 'white',
              }}
            >
              !
            </div>

            <div>
              <p
                className="text-sm font-medium"
                style={{
                  color: '#991b1b',
                }}
              >
                No fue posible completar la operación
              </p>

              <p
                className="text-xs mt-1"
                style={{
                  color: '#b91c1c',
                }}
              >
                {error}
              </p>
            </div>
          </div>
        )}


        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* =================================================
              LEFT
              ================================================= */}

          <div className="lg:col-span-3 space-y-4">

            {/* PDF UPLOAD */}

            <div
              className="rounded-2xl overflow-hidden"
              style={{
                backgroundColor: 'white',
                border:
                  '1px solid #dce8fd',
              }}
            >

              <div
                className="px-5 py-4"
                style={{
                  borderBottom:
                    '1px solid #f0f5fe',
                }}
              >
                <p
                  className="mono text-xs font-semibold tracking-wide uppercase"
                  style={{
                    color: '#162c5e',
                  }}
                >
                  01 · Documento
                </p>
              </div>


              {pdfFile ? (
                <div className="p-5">

                  <FileCard
                    label="PDF a firmar"
                    file={pdfFile}
                    type="pdf"
                    onSelect={() =>
                      pdfInputRef.current?.click()
                    }
                  />

                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={handlePdfInput}
                  />

                </div>
              ) : (
                <div className="p-5">

                  <div
                    className="rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200"
                    style={{
                      border:
                        `2px dashed ${
                          isDragging
                            ? '#2450a4'
                            : '#a8c4f4'
                        }`,
                      backgroundColor:
                        isDragging
                          ? 'rgba(36,80,164,0.06)'
                          : 'white',
                      padding: '42px 24px',
                    }}
                    onDragOver={e => {
                      e.preventDefault()
                      setIsDragging(true)
                    }}
                    onDragLeave={() =>
                      setIsDragging(false)
                    }
                    onDrop={handleDrop}
                    onClick={() =>
                      pdfInputRef.current?.click()
                    }
                  >

                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                      style={{
                        backgroundColor:
                          '#f0f5fe',
                      }}
                    >
                      <PdfIcon
                        className="w-7 h-7"
                        style={{
                          color:
                            isDragging
                              ? '#2450a4'
                              : '#6b98e8',
                        }}
                      />
                    </div>

                    <p
                      className="font-semibold text-sm mb-1"
                      style={{
                        color: '#0a1628',
                      }}
                    >
                      Arrastra tu PDF aquí
                    </p>

                    <p
                      className="text-xs mb-4"
                      style={{
                        color: '#6b98e8',
                      }}
                    >
                      o haz clic para seleccionar
                    </p>

                    <span
                      className="mono text-xs px-3 py-1.5 rounded-lg"
                      style={{
                        backgroundColor:
                          '#f0f5fe',
                        color: '#6b98e8',
                        border:
                          '1px solid #dce8fd',
                      }}
                    >
                      Solo archivos .pdf
                    </span>

                    <input
                      ref={pdfInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      onChange={handlePdfInput}
                    />

                  </div>

                </div>
              )}

            </div>


            {/* PRIVATE KEY */}

            <div
              className="rounded-2xl p-5"
              style={{
                backgroundColor: 'white',
                border:
                  '1px solid #dce8fd',
              }}
            >

              <p
                className="mono text-xs font-semibold tracking-wide uppercase mb-4"
                style={{
                  color: '#162c5e',
                }}
              >
                02 · Clave privada
              </p>

              <FileCard
                label="Clave privada del firmante"
                file={privateKeyFile}
                type="key"
                onSelect={() =>
                  privateKeyInputRef.current?.click()
                }
              />

              <input
                ref={privateKeyInputRef}
                type="file"
                accept=".pem,.key"
                className="hidden"
                onChange={handlePrivateKeyInput}
              />

            </div>


            {/* CERTIFICATE */}

            <div
              className="rounded-2xl p-5"
              style={{
                backgroundColor: 'white',
                border:
                  '1px solid #dce8fd',
              }}
            >

              <p
                className="mono text-xs font-semibold tracking-wide uppercase mb-4"
                style={{
                  color: '#162c5e',
                }}
              >
                03 · Certificado
              </p>

              <FileCard
                label="Certificado X.509 del firmante"
                file={certificateFile}
                type="certificate"
                onSelect={() =>
                  certificateInputRef.current?.click()
                }
              />

              <input
                ref={certificateInputRef}
                type="file"
                accept=".pem,.crt,.cer"
                className="hidden"
                onChange={handleCertificateInput}
              />

            </div>


            {/* SIGN BUTTON */}

            {signState !== 'signed' && (
              <button
                type="button"
                disabled={!canSign}
                onClick={handleSign}
                className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200"
                style={{
                  backgroundColor:
                    canSign
                      ? '#0a1628'
                      : '#c7d8f5',
                  color: 'white',
                  cursor:
                    canSign
                      ? 'pointer'
                      : 'not-allowed',
                }}
              >

                {signState === 'signing' ? (
                  <>
                    <div
                      className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"
                    />

                    Firmando documento...
                  </>
                ) : (
                  <>
                    <LockIcon className="w-4 h-4" />

                    Firmar PDF
                  </>
                )}

              </button>
            )}


            {/* DOWNLOAD */}

            {signState === 'signed' && (
              <div className="space-y-3">

                <button
                  type="button"
                  onClick={handleDownload}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200"
                  style={{
                    backgroundColor: '#2450a4',
                    color: 'white',
                  }}
                >
                  <DownloadIcon className="w-4 h-4" />

                  Descargar PDF firmado
                </button>


                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full py-3 rounded-xl text-sm font-medium"
                  style={{
                    backgroundColor: 'white',
                    color: '#3b6fd4',
                    border:
                      '1.5px solid #dce8fd',
                  }}
                >
                  Firmar otro documento
                </button>

              </div>
            )}

          </div>


          {/* =================================================
              RIGHT
              ================================================= */}

          <div className="lg:col-span-2 space-y-4">

            {/* USER */}

            <div
              className="rounded-2xl p-5"
              style={{
                backgroundColor: 'white',
                border:
                  '1px solid #dce8fd',
              }}
            >

              <p
                className="mono text-xs font-semibold tracking-wide uppercase mb-4"
                style={{
                  color: '#162c5e',
                }}
              >
                Identidad del firmante
              </p>

              <div className="space-y-3">

                <InfoRow
                  label="Nombre"
                  value={userName || userEmail}
                />

                <InfoRow
                  label="Email"
                  value={userEmail}
                />

                <InfoRow
                  label="Algoritmo"
                  value={algoLabel}
                />

                {certSerial && (
                  <InfoRow
                    label="Certificado"
                    value={certSerial}
                  />
                )}

              </div>

            </div>


            {/* REQUIREMENTS */}

            <div
              className="rounded-2xl overflow-hidden"
              style={{
                backgroundColor: '#0a1628',
              }}
            >

              <div className="p-6">

                <p
                  className="mono text-xs tracking-widest uppercase mb-5"
                  style={{
                    color: '#10b981',
                  }}
                >
                  Componentes requeridos
                </p>

                <Requirement
                  number="01"
                  title="Documento PDF"
                  description="Documento que será procesado y firmado."
                  active={pdfFile !== null}
                />

                <Requirement
                  number="02"
                  title="Clave privada"
                  description="Clave privada correspondiente al certificado."
                  active={privateKeyFile !== null}
                />

                <Requirement
                  number="03"
                  title="Certificado X.509"
                  description="Certificado que identifica al firmante."
                  active={certificateFile !== null}
                />

              </div>

            </div>


            {/* STATUS */}

            {signState === 'signed' && (
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  border:
                    '1px solid rgba(16,185,129,0.3)',
                  backgroundColor:
                    'rgba(16,185,129,0.05)',
                }}
              >

                <div className="p-5">

                  <div className="flex items-center gap-3 mb-4">

                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor:
                          '#10b981',
                      }}
                    >
                      <CheckIcon className="w-5 h-5 text-white" />
                    </div>

                    <div>

                      <p
                        className="font-semibold text-sm"
                        style={{
                          color: '#065f46',
                        }}
                      >
                        PDF firmado correctamente
                      </p>

                      <p
                        className="text-xs mt-0.5"
                        style={{
                          color: '#059669',
                        }}
                      >
                        pyHanko completó la firma digital.
                      </p>

                    </div>

                  </div>


                  <div
                    className="rounded-lg p-3"
                    style={{
                      backgroundColor:
                        'rgba(16,185,129,0.06)',
                      border:
                        '1px solid rgba(16,185,129,0.15)',
                    }}
                  >

                    <p
                      className="mono text-xs break-all"
                      style={{
                        color: '#047857',
                      }}
                    >
                      {signedFileName}
                    </p>

                  </div>

                </div>

              </div>
            )}


            {/* SECURITY NOTE */}

            <div
              className="rounded-xl p-4 flex items-start gap-3"
              style={{
                backgroundColor: 'white',
                border:
                  '1px solid #dce8fd',
              }}
            >

              <ShieldIcon
                className="w-5 h-5 flex-shrink-0"
                style={{
                  color: '#10b981',
                }}
              />

              <p
                className="text-xs leading-relaxed"
                style={{
                  color: '#6b98e8',
                }}
              >
                La operación requiere autenticación mediante
                JWT. El servicio verifica que la clave privada
                corresponda al certificado antes de generar
                la firma PDF.
              </p>

            </div>

          </div>

        </div>

      </div>

    </div>
  )
}


// ===========================================================
// INFO ROW
// ===========================================================

function InfoRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-start justify-between gap-3">

      <span
        className="text-xs flex-shrink-0"
        style={{
          color: '#6b98e8',
        }}
      >
        {label}
      </span>

      <span
        className="mono text-xs text-right break-all"
        style={{
          color: '#0a1628',
          maxWidth: '180px',
        }}
      >
        {value}
      </span>

    </div>
  )
}


// ===========================================================
// REQUIREMENT
// ===========================================================

function Requirement({
  number,
  title,
  description,
  active,
}: {
  number: string
  title: string
  description: string
  active: boolean
}) {
  return (
    <div className="flex gap-3 mb-5 last:mb-0">

      <div
        className="mono text-xs font-semibold flex-shrink-0 mt-0.5"
        style={{
          color: active
            ? '#10b981'
            : '#3b6fd4',
        }}
      >
        {number}
      </div>

      <div>

        <p
          className="text-sm font-medium mb-1"
          style={{
            color: active
              ? 'white'
              : '#a8c4f4',
          }}
        >
          {title}

          {active && (
            <span
              className="ml-2"
              style={{
                color: '#34d399',
              }}
            >
              ✓
            </span>
          )}
        </p>

        <p
          className="text-xs leading-relaxed"
          style={{
            color: '#6b98e8',
          }}
        >
          {description}
        </p>

      </div>

    </div>
  )
}


// ===========================================================
// PDF ICON
// ===========================================================

function PdfIcon({
  className,
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  )
}