import { useRef, useState } from 'react'
import {
  CheckIcon,
  ShieldIcon,
  LockIcon,
} from './icons'

interface ValidateCertificatePageProps {
  token: string
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
  fingerprint_sha256?: string
  subject?: string
  issuer?: string
  algorithm?: string
  issued_at?: string
  expires_at?: string
}

type ValidationState =
  | 'idle'
  | 'validating'
  | 'success'
  | 'error'

export function ValidateCertificatePage({
  token,
  onBack,
}: ValidateCertificatePageProps) {
  const fileRef =
    useRef<HTMLInputElement>(null)

  const [pdfFile, setPdfFile] =
    useState<File | null>(null)

  const [state, setState] =
    useState<ValidationState>('idle')

  const [result, setResult] =
    useState<CertificateValidation | null>(null)

  const [error, setError] =
    useState('')

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      event.target.files?.[0]

    if (!file) {
      return
    }

    if (
      file.type !== 'application/pdf' &&
      !file.name.toLowerCase().endsWith('.pdf')
    ) {
      setError(
        'Selecciona un archivo PDF.',
      )
      setPdfFile(null)
      return
    }

    setPdfFile(file)
    setError('')
    setResult(null)
    setState('idle')
  }

  const validateCertificate = async () => {
    if (!pdfFile) {
      setError(
        'Selecciona un PDF firmado.',
      )
      return
    }

    if (!token) {
      setError(
        'No existe una sesión autenticada.',
      )
      return
    }

    setState('validating')
    setError('')
    setResult(null)

    try {
      const formData = new FormData()

      formData.append(
        'pdf',
        pdfFile,
      )

      const response = await fetch(
        '/client-api/signatures/verify-pdf-certificate',
        {
          method: 'POST',

          headers: {
            Authorization:
              `Bearer ${token}`,
          },

          body: formData,
        },
      )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data?.detail ||
          'No fue posible validar el certificado.',
        )
      }

      const validation =
        data.certificate

      setResult(validation)
      setState('success')

    } catch (err) {
      setState('error')

      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al validar el certificado.',
      )
    }
  }

  const reset = () => {
    setPdfFile(null)
    setResult(null)
    setError('')
    setState('idle')

    if (fileRef.current) {
      fileRef.current.value = ''
    }
  }

  const isValid =
    result?.valid === true

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: '#f8fafc',
      }}
    >
      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* HEADER */}

        <div className="flex items-center justify-between mb-8">

          <div>
            <button
              onClick={onBack}
              className="text-sm mb-3"
              style={{
                color: '#64748b',
              }}
            >
              ← Volver
            </button>

            <h1
              className="text-2xl font-semibold"
              style={{
                color: '#0f172a',
              }}
            >
              Validar certificado
            </h1>

            <p
              className="text-sm mt-2"
              style={{
                color: '#64748b',
              }}
            >
              Verifica el certificado utilizado
              para firmar un documento PDF.
            </p>
          </div>

          <ShieldIcon
            className="w-9 h-9"
            style={{
              color: '#2450a4',
            }}
          />

        </div>

        {/* UPLOAD CARD */}

        <div
          className="rounded-2xl p-6 mb-6"
          style={{
            backgroundColor: '#ffffff',
            border:
              '1px solid rgba(15,23,42,0.08)',
          }}
        >

          <div className="flex items-start gap-4 mb-6">

            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor:
                  'rgba(36,80,164,0.08)',
              }}
            >
              <LockIcon
                className="w-5 h-5"
                style={{
                  color: '#2450a4',
                }}
              />
            </div>

            <div>
              <h2
                className="font-medium"
                style={{
                  color: '#0f172a',
                }}
              >
                PDF firmado digitalmente
              </h2>

              <p
                className="text-sm mt-1"
                style={{
                  color: '#64748b',
                }}
              >
                El certificado se extraerá
                automáticamente del documento.
              </p>
            </div>

          </div>

          {/* FILE */}

          <input
            ref={fileRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() =>
              fileRef.current?.click()
            }
            className="w-full rounded-xl p-8 text-center transition"
            style={{
              border:
                '1.5px dashed #cbd5e1',
              backgroundColor: '#f8fafc',
            }}
          >

            <div
              className="text-sm font-medium"
              style={{
                color: '#2450a4',
              }}
            >
              {pdfFile
                ? 'PDF seleccionado'
                : 'Seleccionar PDF'}
            </div>

            <div
              className="text-xs mt-2"
              style={{
                color: '#64748b',
              }}
            >
              {pdfFile
                ? pdfFile.name
                : 'Haz clic para seleccionar un documento'}
            </div>

          </button>

          {/* ACTION */}

          <button
            onClick={validateCertificate}
            disabled={
              !pdfFile ||
              state === 'validating'
            }
            className="w-full mt-5 rounded-xl py-3 text-sm font-medium transition"
            style={{
              backgroundColor:
                !pdfFile ||
                state === 'validating'
                  ? '#cbd5e1'
                  : '#2450a4',
              color: '#ffffff',
              cursor:
                !pdfFile ||
                state === 'validating'
                  ? 'not-allowed'
                  : 'pointer',
            }}
          >
            {state === 'validating'
              ? 'Validando certificado...'
              : 'Validar certificado'}
          </button>

          {/* ERROR */}

          {error && (
            <div
              className="mt-5 rounded-xl p-4 text-sm"
              style={{
                backgroundColor: '#fef2f2',
                border:
                  '1px solid #fecaca',
                color: '#b91c1c',
              }}
            >
              {error}
            </div>
          )}

        </div>

        {/* RESULT */}

        {state === 'success' &&
          result && (
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                backgroundColor: '#ffffff',
                border:
                  `1px solid ${
                    isValid
                      ? '#a7f3d0'
                      : '#fecaca'
                  }`,
              }}
            >

              {/* RESULT HEADER */}

              <div
                className="px-6 py-5 flex items-center justify-between"
                style={{
                  backgroundColor:
                    isValid
                      ? '#065f46'
                      : '#991b1b',
                }}
              >

                <div className="flex items-center gap-3">

                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{
                      backgroundColor:
                        'rgba(255,255,255,0.12)',
                    }}
                  >
                    {isValid ? (
                      <CheckIcon
                        className="w-5 h-5"
                        style={{
                          color: '#ffffff',
                        }}
                      />
                    ) : (
                      <ShieldIcon
                        className="w-5 h-5"
                        style={{
                          color: '#ffffff',
                        }}
                      />
                    )}
                  </div>

                  <div>

                    <p
                      className="font-medium text-white"
                    >
                      {isValid
                        ? 'Certificado válido'
                        : 'Certificado no válido'}
                    </p>

                    <p
                      className="text-xs mt-1"
                      style={{
                        color:
                          'rgba(255,255,255,0.7)',
                      }}
                    >
                      Resultado de validación
                      de la Autoridad Certificadora
                    </p>

                  </div>

                </div>

                <div
                  className="px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor:
                      'rgba(255,255,255,0.12)',
                    color: '#ffffff',
                  }}
                >
                  {isValid
                    ? 'VÁLIDO'
                    : 'NO VÁLIDO'}
                </div>

              </div>

              {/* CHECKS */}

              <div className="p-6">

                <h3
                  className="text-sm font-semibold mb-4"
                  style={{
                    color: '#0f172a',
                  }}
                >
                  Comprobaciones
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                  <ValidationCheck
                    label="Emitido por la CA"
                    value={
                      result.issued_by_ca
                    }
                  />

                  <ValidationCheck
                    label="Firma del certificado válida"
                    value={
                      result.signature_valid
                    }
                  />

                  <ValidationCheck
                    label="Existe en la base de datos"
                    value={
                      result.exists_in_database
                    }
                  />

                  <ValidationCheck
                    label="No revocado"
                    value={
                      !result.revoked
                    }
                  />

                  <ValidationCheck
                    label="No expirado"
                    value={
                      !result.expired
                    }
                  />

                  <ValidationCheck
                    label="Fecha de validez correcta"
                    value={
                      !result.not_yet_valid
                    }
                  />

                </div>

                {/* DETAILS */}

                <div className="mt-7">

                  <h3
                    className="text-sm font-semibold mb-4"
                    style={{
                      color: '#0f172a',
                    }}
                  >
                    Información del certificado
                  </h3>

                  <div
                    className="rounded-xl overflow-hidden"
                    style={{
                      border:
                        '1px solid #e2e8f0',
                    }}
                  >

                    <DetailRow
                      label="Serial"
                      value={
                        result.serial_number
                      }
                    />

                    <DetailRow
                      label="Subject"
                      value={
                        result.subject
                      }
                    />

                    <DetailRow
                      label="Issuer"
                      value={
                        result.issuer
                      }
                    />

                    <DetailRow
                      label="Algoritmo"
                      value={
                        result.algorithm
                      }
                    />

                    <DetailRow
                      label="Emitido"
                      value={
                        result.issued_at
                      }
                    />

                    <DetailRow
                      label="Expira"
                      value={
                        result.expires_at
                      }
                    />

                    <DetailRow
                      label="SHA-256"
                      value={
                        result.fingerprint_sha256
                      }
                      mono
                    />

                  </div>

                </div>

                {/* RESET */}

                <button
                  onClick={reset}
                  className="w-full mt-6 rounded-xl py-3 text-sm font-medium"
                  style={{
                    backgroundColor: '#f1f5f9',
                    color: '#334155',
                  }}
                >
                  Validar otro PDF
                </button>

              </div>

            </div>
          )}

      </div>
    </div>
  )
}


/* =========================================================
   VALIDATION CHECK
   ========================================================= */

function ValidationCheck({
  label,
  value,
}: {
  label: string
  value: boolean
}) {
  return (
    <div
      className="flex items-center justify-between rounded-xl px-4 py-3"
      style={{
        backgroundColor:
          value
            ? '#f0fdf4'
            : '#fef2f2',
        border:
          `1px solid ${
            value
              ? '#bbf7d0'
              : '#fecaca'
          }`,
      }}
    >

      <span
        className="text-sm"
        style={{
          color: '#334155',
        }}
      >
        {label}
      </span>

      <span
        className="text-xs font-semibold"
        style={{
          color:
            value
              ? '#15803d'
              : '#b91c1c',
        }}
      >
        {value ? 'OK' : 'NO'}
      </span>

    </div>
  )
}


/* =========================================================
   DETAIL ROW
   ========================================================= */

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value?: string
  mono?: boolean
}) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-[150px_1fr] gap-2 px-4 py-3"
      style={{
        borderBottom:
          '1px solid #e2e8f0',
      }}
    >

      <span
        className="text-xs font-medium"
        style={{
          color: '#64748b',
        }}
      >
        {label}
      </span>

      <span
        className={
          mono
            ? 'text-xs break-all font-mono'
            : 'text-sm break-all'
        }
        style={{
          color: '#0f172a',
        }}
      >
        {value || '—'}
      </span>

    </div>
  )
}