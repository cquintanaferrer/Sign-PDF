import { useState } from 'react'

import {
  CheckIcon,
  ShieldIcon,
  LockIcon,
} from './icons'


interface ValidateWebsitePageProps {
  token: string
  onBack: () => void
}


interface CertificateChainItem {
  subject?: string
  issuer?: string
  serial_number?: string
  not_valid_before?: string
  not_valid_after?: string
  algorithm?: string
}


interface ExternalCertificateResult {
  valid: boolean
  hostname?: string
  reason?: string
  chain?: CertificateChainItem[]
}


export function ValidateWebsitePage({
  token,
  onBack,
}: ValidateWebsitePageProps) {

  const [hostname, setHostname] =
    useState('')

  const [result, setResult] =
    useState<ExternalCertificateResult | null>(
      null,
    )

  const [loading, setLoading] =
    useState(false)

  const [error, setError] =
    useState('')


  const verifyWebsite = async () => {

    const normalizedHostname =
      hostname
        .trim()
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '')

    if (!normalizedHostname) {

      setError(
        'Introduce el nombre del sitio web.',
      )

      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {

      const response = await fetch(
        '/client-api/certificates/verify-external',
        {
          method: 'POST',

          headers: {
            Authorization:
              `Bearer ${token}`,
          },

          /*
           * El endpoint de la prueba recibe
           * hostname como query parameter.
           */
        },
      )

      /*
       * Como el endpoint recibe hostname como
       * parámetro, debemos construir la URL.
       */

      const url =
        `/client-api/certificates/verify-external` +
        `?hostname=${encodeURIComponent(
          normalizedHostname,
        )}`

      const finalResponse =
        await fetch(
          url,
          {
            method: 'POST',

            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          },
        )

      const data =
        await finalResponse.json()

      if (!finalResponse.ok) {

        throw new Error(
          data?.detail ||
          'No fue posible verificar el certificado del sitio.',
        )
      }

      setResult({
        ...data,
        hostname:
          data.hostname ||
          normalizedHostname,
      })

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error durante la verificación.',
      )

    } finally {

      setLoading(false)
    }
  }


  const reset = () => {

    setHostname('')
    setResult(null)
    setError('')
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

      <div
        className="max-w-4xl mx-auto px-6 py-10"
      >

        {/* =====================================================
            HEADER
            ===================================================== */}

        <div
          className="flex items-center justify-between mb-8"
        >

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
              Verificar sitio web
            </h1>

            <p
              className="text-sm mt-2"
              style={{
                color: '#64748b',
              }}
            >
              Comprueba el certificado TLS
              y la cadena de confianza de un
              sitio web.
            </p>

          </div>

          <ShieldIcon
            className="w-9 h-9"
            style={{
              color: '#2450a4',
            }}
          />

        </div>


        {/* =====================================================
            FORMULARIO
            ===================================================== */}

        {!result && (

          <div
            className="rounded-2xl p-6"
            style={{
              backgroundColor: '#ffffff',
              border:
                '1px solid rgba(15,23,42,0.08)',
            }}
          >

            <div
              className="flex items-start gap-4 mb-6"
            >

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
                  Certificado TLS
                </h2>

                <p
                  className="text-sm mt-1"
                  style={{
                    color: '#64748b',
                  }}
                >
                  Introduce el dominio que deseas
                  verificar.
                </p>

              </div>

            </div>


            <label
              className="block text-sm font-medium mb-2"
              style={{
                color: '#334155',
              }}
            >
              Sitio web
            </label>

            <input
              type="text"
              value={hostname}
              onChange={(event) =>
                setHostname(event.target.value)
              }
              onKeyDown={(event) => {

                if (
                  event.key === 'Enter' &&
                  !loading
                ) {
                  verifyWebsite()
                }

              }}
              placeholder="google.com"
              disabled={loading}
              className="w-full rounded-xl px-4 py-3 outline-none"
              style={{
                border:
                  '1px solid #cbd5e1',
                color: '#0f172a',
                backgroundColor: '#ffffff',
              }}
            />

            <p
              className="text-xs mt-2"
              style={{
                color: '#94a3b8',
              }}
            >
              Puedes introducir el dominio con
              o sin https://.
            </p>


            <button
              onClick={verifyWebsite}
              disabled={
                loading ||
                !hostname.trim()
              }
              className="w-full mt-5 rounded-xl py-3 text-sm font-medium"
              style={{
                backgroundColor:
                  loading ||
                  !hostname.trim()
                    ? '#cbd5e1'
                    : '#2450a4',
                color: '#ffffff',
                cursor:
                  loading ||
                  !hostname.trim()
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >

              {loading
                ? 'Verificando...'
                : 'Verificar certificado'}

            </button>


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

        )}


        {/* =====================================================
            RESULTADO
            ===================================================== */}

        {result && (

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

              <div
                className="flex items-center gap-3"
              >

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
                    {result.hostname}
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


            <div className="p-6">

              {/* RAZÓN */}

              {result.reason && (

                <div className="mb-6">

                  <h3
                    className="text-sm font-semibold mb-2"
                    style={{
                      color: '#0f172a',
                    }}
                  >
                    Resultado
                  </h3>

                  <div
                    className="rounded-xl p-4 text-sm"
                    style={{
                      backgroundColor:
                        isValid
                          ? '#f0fdf4'
                          : '#fef2f2',
                      color:
                        isValid
                          ? '#166534'
                          : '#991b1b',
                    }}
                  >
                    {result.reason}
                  </div>

                </div>

              )}


              {/* CADENA */}

              <div>

                <div
                  className="flex items-center justify-between mb-4"
                >

                  <h3
                    className="text-sm font-semibold"
                    style={{
                      color: '#0f172a',
                    }}
                  >
                    Cadena de certificados
                  </h3>

                  <span
                    className="text-xs"
                    style={{
                      color: '#64748b',
                    }}
                  >
                    {result.chain?.length || 0}{' '}
                    certificado(s)
                  </span>

                </div>


                <div
                  className="space-y-3"
                >

                  {result.chain &&
                  result.chain.length > 0 ? (

                    result.chain.map(
                      (
                        certificate,
                        index,
                      ) => (

                        <div
                          key={
                            certificate.serial_number ||
                            index
                          }
                          className="rounded-xl p-4"
                          style={{
                            backgroundColor:
                              '#f8fafc',
                            border:
                              '1px solid #e2e8f0',
                          }}
                        >

                          <div
                            className="flex items-center gap-3 mb-3"
                          >

                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center"
                              style={{
                                backgroundColor:
                                  'rgba(36,80,164,0.08)',
                              }}
                            >

                              <ShieldIcon
                                className="w-4 h-4"
                                style={{
                                  color: '#2450a4',
                                }}
                              />

                            </div>

                            <div>

                              <p
                                className="text-sm font-medium"
                                style={{
                                  color:
                                    '#0f172a',
                                }}
                              >
                                Certificado{' '}
                                {index + 1}
                              </p>

                            </div>

                          </div>


                          <div className="space-y-2">

                            <ExternalDetail
                              label="Subject"
                              value={
                                certificate.subject
                              }
                            />

                            <ExternalDetail
                              label="Issuer"
                              value={
                                certificate.issuer
                              }
                            />

                            <ExternalDetail
                              label="Serial"
                              value={
                                certificate.serial_number
                              }
                            />

                            <ExternalDetail
                              label="Algoritmo"
                              value={
                                certificate.algorithm
                              }
                            />

                            <ExternalDetail
                              label="Válido desde"
                              value={
                                certificate.not_valid_before
                              }
                            />

                            <ExternalDetail
                              label="Válido hasta"
                              value={
                                certificate.not_valid_after
                              }
                            />

                          </div>

                        </div>

                      ),
                    )

                  ) : (

                    <div
                      className="rounded-xl p-4 text-sm"
                      style={{
                        backgroundColor:
                          '#f8fafc',
                        color:
                          '#64748b',
                      }}
                    >
                      La respuesta no contiene
                      información detallada de
                      la cadena.
                    </div>

                  )}

                </div>

              </div>


              <button
                onClick={reset}
                className="w-full mt-6 rounded-xl py-3 text-sm font-medium"
                style={{
                  backgroundColor:
                    '#f1f5f9',
                  color: '#334155',
                }}
              >
                Verificar otro sitio
              </button>

            </div>

          </div>

        )}

      </div>

    </div>
  )
}


/* =========================================================
   DETAIL
   ========================================================= */

function ExternalDetail({
  label,
  value,
}: {
  label: string
  value?: string
}) {
  return (
    <div
      className="grid grid-cols-[120px_1fr] gap-3"
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
        className="text-xs break-all"
        style={{
          color: '#0f172a',
        }}
      >
        {value || '—'}
      </span>

    </div>
  )
}