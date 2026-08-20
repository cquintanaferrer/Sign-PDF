import { useState } from 'react'

import {
  EcdsaProvider,
  createEcdsaP256Csr,
} from '../crypto'

import {
  ShieldIcon,
  LockIcon,
  DownloadIcon,
  CheckIcon,
} from './icons'


interface CertificateData {
  id: string
  status: string
  requester_username?: string
  serial_number?: string
  subject?: string
  issuer?: string
  algorithm?: string
  issued_at?: string
  expires_at?: string
  certificate?: string
}

const API_URL = '/api/csr'
const STORAGE_KEY = 'signpdf_certificate_request_id'

export function CertificatePage() {
  const [privateKeyFile, setPrivateKeyFile] =
    useState<File | null>(null)

  const [publicKeyFile, setPublicKeyFile] =
    useState<File | null>(null)

  const [requestId, setRequestId] =
    useState<string | null>(() => {
      return localStorage.getItem(STORAGE_KEY)
    })

  const [requestStatus, setRequestStatus] =
    useState<string | null>(null)

  const [certificate, setCertificate] =
    useState<CertificateData | null>(null)

  const [submitting, setSubmitting] =
    useState(false)

  const [checking, setChecking] =
    useState(false)

  const [error, setError] =
    useState('')

  // =========================================================
  // FILES
  // =========================================================

  const handlePrivateKeyChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setPrivateKeyFile(file)
    setError('')
  }

  const handlePublicKeyChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setPublicKeyFile(file)
    setError('')
  }

  // =========================================================
  // CREATE CSR
  // =========================================================

  const createCsr = async (): Promise<string> => {
    if (!privateKeyFile) {
      throw new Error(
        'Debes seleccionar la clave privada.',
      )
    }

    if (!publicKeyFile) {
      throw new Error(
        'Debes seleccionar la clave pública.',
      )
    }

    /*
     * Las llaves se leen únicamente en el navegador.
     */
    const privateKeyPem =
      await privateKeyFile.text()

    const publicKeyPem =
      await publicKeyFile.text()

    /*
     * Importamos las llaves como CryptoKey.
     */
    const provider =
      new EcdsaProvider()

    const privateKey =
      await provider.importPrivateKey(
        privateKeyPem,
      )

    const publicKey =
      await provider.importPublicKey(
        publicKeyPem,
      )

    /*
     * Subject temporal.
     *
     * Posteriormente podemos sustituirlo por
     * los datos del usuario autenticado.
     */
    const subject = {
      commonName: 'SignPDF User',
      email: 'user@signpdf.local',
    }

    /*
     * La CSR se genera y firma LOCALMENTE.
     *
     * La clave privada nunca se envía
     * al backend.
     */
    return createEcdsaP256Csr(
      privateKey,
      publicKey,
      subject,
    )
  }

  // =========================================================
  // SUBMIT CSR
  // =========================================================

  const submitCertificateRequest =
    async () => {
      setError('')
      setCertificate(null)
      setRequestStatus(null)

      if (!privateKeyFile) {
        setError(
          'Selecciona la clave privada.',
        )
        return
      }

      if (!publicKeyFile) {
        setError(
          'Selecciona la clave pública.',
        )
        return
      }

      setSubmitting(true)

      try {
        /*
         * Crear CSR localmente.
         */
        const csrPem =
          await createCsr()

        const csrBlob =
          new Blob(
            [csrPem],
            {
              type: 'application/pkcs10',
            },
          )

        const formData =
          new FormData()

        /*
         * SOLAMENTE enviamos la CSR.
         */
        formData.append(
          'csr',
          csrBlob,
          'certificate_request.csr',
        )

        const response =
          await fetch(
            API_URL,
            {
              method: 'POST',
              body: formData,
            },
          )

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            data?.detail ||
            'No fue posible enviar la solicitud.',
          )
        }

        const id =
          String(data.id)

        /*
         * Guardamos el Request ID para que
         * sobreviva a un cambio de página
         * o recarga.
         */
        localStorage.setItem(
          STORAGE_KEY,
          id,
        )

        setRequestId(id)

        setRequestStatus(
          data.status ?? 'PENDING',
        )

      } catch (err) {
        console.error(
          'Error solicitando certificado:',
          err,
        )

        setError(
          err instanceof Error
            ? err.message
            : 'No fue posible solicitar el certificado.',
        )
      } finally {
        setSubmitting(false)
      }
    }

  // =========================================================
  // CHECK CERTIFICATE
  // =========================================================

  const checkCertificate =
    async () => {
      const id =
        requestId ||
        localStorage.getItem(
          STORAGE_KEY,
        )

      if (!id) {
        setError(
          'No existe una solicitud pendiente.',
        )
        return
      }

      setError('')
      setChecking(true)

      try {
        const response =
          await fetch(
            `${API_URL}/${id}`,
          )

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            data?.detail ||
            'No fue posible consultar la solicitud.',
          )
        }

        setRequestId(id)
        setRequestStatus(
          data.status,
        )

        setCertificate(data)

      } catch (err) {
        console.error(
          'Error consultando certificado:',
          err,
        )

        setError(
          err instanceof Error
            ? err.message
            : 'No fue posible consultar la solicitud.',
        )
      } finally {
        setChecking(false)
      }
    }

  // =========================================================
  // DOWNLOAD CERTIFICATE
  // =========================================================

  const downloadCertificate = () => {
    if (!certificate?.certificate) {
      return
    }

    const blob =
      new Blob(
        [certificate.certificate],
        {
          type:
            'application/x-pem-file',
        },
      )

    const url =
      URL.createObjectURL(blob)

    const link =
      document.createElement('a')

    link.href = url

    link.download =
      `certificate-${certificate.serial_number ?? requestId}.crt`

    document.body.appendChild(link)

    link.click()

    link.remove()

    URL.revokeObjectURL(url)
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
      <div
        className="max-w-5xl mx-auto px-6 py-12"
      >

        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="mb-8">
          <p
            className="mono text-xs font-semibold tracking-widest uppercase mb-2"
            style={{
              color: '#10b981',
            }}
          >
            Certificados
          </p>

          <h1
            className="text-3xl font-semibold"
            style={{
              color: '#0a1628',
            }}
          >
            Solicitar certificado
          </h1>

          <p
            className="mt-2 text-sm"
            style={{
              color: '#3b6fd4',
            }}
          >
            Solicita un certificado ECDSA P-256
            utilizando tu par de llaves.
          </p>
        </div>

        {/* =====================================================
            ERROR
        ===================================================== */}

        {error && (
          <div
            className="mb-6 rounded-xl p-4"
            style={{
              backgroundColor:
                'rgba(220,38,38,0.06)',
              border:
                '1px solid rgba(220,38,38,0.2)',
            }}
          >
            <p
              className="text-sm"
              style={{
                color: '#991b1b',
              }}
            >
              {error}
            </p>
          </div>
        )}

        <div
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >

          {/* ===================================================
              REQUEST
          =================================================== */}

          <div
            className="bg-white rounded-2xl p-6"
            style={{
              border:
                '1px solid #dce8fd',
            }}
          >

            <div
              className="flex items-center gap-3 mb-6"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  backgroundColor:
                    '#f0f5fe',
                }}
              >
                <ShieldIcon
                  className="w-5 h-5"
                  style={{
                    color: '#2450a4',
                  }}
                />
              </div>

              <div>
                <h2
                  className="font-semibold"
                  style={{
                    color: '#0a1628',
                  }}
                >
                  ECDSA P-256
                </h2>

                <p
                  className="text-xs"
                  style={{
                    color: '#6b98e8',
                  }}
                >
                  SHA-256
                </p>
              </div>
            </div>

            {/* =================================================
                PRIVATE KEY
            ================================================= */}

            <div className="mb-5">

              <label
                className="block text-sm font-semibold mb-2"
                style={{
                  color: '#162c5e',
                }}
              >
                Clave privada
              </label>

              <label
                className="block rounded-xl p-5 text-center cursor-pointer"
                style={{
                  backgroundColor:
                    '#fff7f7',
                  border:
                    '1px dashed #e9a4a4',
                }}
              >
                <input
                  type="file"
                  accept=".pem,.key"
                  className="hidden"
                  onChange={
                    handlePrivateKeyChange
                  }
                />

                <LockIcon
                  className="w-6 h-6 mx-auto mb-2"
                  style={{
                    color: '#dc2626',
                  }}
                />

                <p
                  className="text-xs font-semibold"
                  style={{
                    color: '#b91c1c',
                  }}
                >
                  Seleccionar clave privada
                </p>
              </label>

              {privateKeyFile && (
                <p
                  className="text-xs mt-2"
                  style={{
                    color: '#047857',
                  }}
                >
                  ✓ {privateKeyFile.name}
                </p>
              )}
            </div>

            {/* =================================================
                PUBLIC KEY
            ================================================= */}

            <div className="mb-5">

              <label
                className="block text-sm font-semibold mb-2"
                style={{
                  color: '#162c5e',
                }}
              >
                Clave pública
              </label>

              <label
                className="block rounded-xl p-5 text-center cursor-pointer"
                style={{
                  backgroundColor:
                    '#f8fbff',
                  border:
                    '1px dashed #a9c4f0',
                }}
              >
                <input
                  type="file"
                  accept=".pem,.pub"
                  className="hidden"
                  onChange={
                    handlePublicKeyChange
                  }
                />

                <ShieldIcon
                  className="w-6 h-6 mx-auto mb-2"
                  style={{
                    color: '#2450a4',
                  }}
                />

                <p
                  className="text-xs font-semibold"
                  style={{
                    color: '#2450a4',
                  }}
                >
                  Seleccionar clave pública
                </p>
              </label>

              {publicKeyFile && (
                <p
                  className="text-xs mt-2"
                  style={{
                    color: '#047857',
                  }}
                >
                  ✓ {publicKeyFile.name}
                </p>
              )}
            </div>

            {/* =================================================
                SECURITY NOTICE
            ================================================= */}

            <div
              className="rounded-xl p-4 mb-5"
              style={{
                backgroundColor:
                  '#fffbeb',
                border:
                  '1px solid #fcd34d',
              }}
            >
              <div
                className="flex items-start gap-2"
              >
                <LockIcon
                  className="w-4 h-4 flex-shrink-0 mt-0.5"
                  style={{
                    color: '#d97706',
                  }}
                />

                <p
                  className="text-[11px] leading-relaxed"
                  style={{
                    color: '#92400e',
                  }}
                >
                  La clave privada se utiliza
                  únicamente en este navegador
                  para firmar la CSR. Nunca se
                  envía a la Autoridad
                  Certificadora.
                </p>
              </div>
            </div>

            {/* =================================================
                SUBMIT
            ================================================= */}

            <button
              type="button"
              onClick={
                submitCertificateRequest
              }
              disabled={
                submitting ||
                !!requestId
              }
              className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
              style={{
                backgroundColor:
                  submitting ||
                  requestId
                    ? '#c7d8f5'
                    : '#0a1628',
                color: 'white',
                cursor:
                  submitting ||
                  requestId
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              {submitting ? (
                <>
                  <div
                    className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"
                  />

                  Generando CSR...
                </>
              ) : (
                <>
                  <ShieldIcon
                    className="w-4 h-4"
                  />

                  Solicitar certificado
                </>
              )}
            </button>

          </div>

          {/* ===================================================
              STATUS
          =================================================== */}

          <div
            className="bg-white rounded-2xl p-6"
            style={{
              border:
                '1px solid #dce8fd',
            }}
          >

            {!requestId ? (

              <div
                className="h-full min-h-[400px] flex flex-col items-center justify-center text-center"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{
                    backgroundColor:
                      '#f0f5fe',
                  }}
                >
                  <ShieldIcon
                    className="w-7 h-7"
                    style={{
                      color: '#6b98e8',
                    }}
                  />
                </div>

                <h2
                  className="font-semibold"
                  style={{
                    color: '#0a1628',
                  }}
                >
                  Sin solicitud pendiente
                </h2>

                <p
                  className="text-sm mt-2 max-w-sm"
                  style={{
                    color: '#6b98e8',
                  }}
                >
                  Selecciona tus dos llaves y
                  solicita un certificado.
                </p>
              </div>

            ) : (

              <div>

                {/* =================================================
                    REQUEST ID
                ================================================= */}

                <div className="mb-6">

                  <div
                    className="flex items-center gap-3 mb-4"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor:
                          '#10b981',
                      }}
                    >
                      <CheckIcon
                        className="w-5 h-5"
                        style={{
                          color: 'white',
                        }}
                      />
                    </div>

                    <div>
                      <h2
                        className="font-semibold"
                        style={{
                          color: '#065f46',
                        }}
                      >
                        Solicitud registrada
                      </h2>

                      <p
                        className="text-xs"
                        style={{
                          color: '#059669',
                        }}
                      >
                        Puedes consultar su estado
                        posteriormente.
                      </p>
                    </div>
                  </div>

                  <p
                    className="mono text-[10px] uppercase mb-2"
                    style={{
                      color: '#6b98e8',
                    }}
                  >
                    Request ID
                  </p>

                  <div
                    className="rounded-xl p-4 break-all"
                    style={{
                      backgroundColor:
                        '#f8fbff',
                      border:
                        '1px solid #dce8fd',
                    }}
                  >
                    <p
                      className="mono text-sm font-semibold"
                      style={{
                        color: '#162c5e',
                      }}
                    >
                      {requestId}
                    </p>
                  </div>
                </div>

                {/* =================================================
                    STATUS
                ================================================= */}

                {requestStatus && (
                  <div
                    className="rounded-xl p-4 mb-5"
                    style={{
                      backgroundColor:
                        requestStatus === 'ISSUED'
                          ? 'rgba(16,185,129,0.06)'
                          : '#f0f5fe',
                    }}
                  >
                    <p
                      className="mono text-xs font-semibold"
                      style={{
                        color:
                          requestStatus === 'ISSUED'
                            ? '#059669'
                            : '#2450a4',
                      }}
                    >
                      {requestStatus}
                    </p>
                  </div>
                )}

                {/* =================================================
                    CHECK
                ================================================= */}

                <button
                  type="button"
                  onClick={
                    checkCertificate
                  }
                  disabled={checking}
                  className="w-full py-3 rounded-xl font-semibold text-sm"
                  style={{
                    backgroundColor:
                      checking
                        ? '#c7d8f5'
                        : '#2450a4',
                    color: 'white',
                  }}
                >
                  {checking
                    ? 'Consultando...'
                    : 'Consultar certificado'}
                </button>

                {/* =================================================
                    CERTIFICATE
                ================================================= */}

                {certificate?.status ===
                  'ISSUED' &&
                  certificate.certificate && (

                  <div className="mt-6">

                    <div
                      className="rounded-xl p-4"
                      style={{
                        backgroundColor:
                          'rgba(16,185,129,0.06)',
                        border:
                          '1px solid rgba(16,185,129,0.2)',
                      }}
                    >

                      <div
                        className="flex items-center gap-2 mb-3"
                      >
                        <CheckIcon
                          className="w-5 h-5"
                          style={{
                            color: '#059669',
                          }}
                        />

                        <p
                          className="font-semibold text-sm"
                          style={{
                            color: '#065f46',
                          }}
                        >
                          Certificado disponible
                        </p>
                      </div>

                      {certificate.serial_number && (
                        <p
                          className="text-xs"
                          style={{
                            color: '#047857',
                          }}
                        >
                          Serial:{' '}
                          {certificate.serial_number}
                        </p>
                      )}

                      {certificate.expires_at && (
                        <p
                          className="text-xs mt-1"
                          style={{
                            color: '#047857',
                          }}
                        >
                          Expira:{' '}
                          {certificate.expires_at}
                        </p>
                      )}

                    </div>

                    <button
                      type="button"
                      onClick={
                        downloadCertificate
                      }
                      className="w-full mt-4 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                      style={{
                        backgroundColor:
                          '#0a1628',
                        color: 'white',
                      }}
                    >
                      <DownloadIcon
                        className="w-4 h-4"
                      />

                      Descargar certificado
                    </button>

                  </div>
                )}

              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  )
}