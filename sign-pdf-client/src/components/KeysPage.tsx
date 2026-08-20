import { useState } from 'react'
import { EcdsaProvider } from '../crypto'
import {
  ShieldIcon,
  LockIcon,
  DownloadIcon,
  CheckIcon,
} from './icons'

interface KeysPageProps {
  onBack?: () => void
}

type Algorithm = 'ECDSA_P256' | 'ML_DSA_65'

interface GeneratedKeys {
  algorithm: Algorithm
  privateKeyPem: string
  publicKeyPem: string
  generatedAt: Date
}

export function KeysPage({ onBack }: KeysPageProps) {
  const [algorithm, setAlgorithm] =
    useState<Algorithm>('ECDSA_P256')

  const [generatedKeys, setGeneratedKeys] =
    useState<GeneratedKeys | null>(null)

  const [generating, setGenerating] =
    useState(false)

  const [showRegenerateWarning, setShowRegenerateWarning] =
    useState(false)

  const [error, setError] =
    useState('')

  const isEcdsa = algorithm === 'ECDSA_P256'

  const generateKeys = async () => {
    setError('')
    setGenerating(true)

    try {
      if (algorithm === 'ML_DSA_65') {
        throw new Error(
          'La generación de llaves ML-DSA-65 todavía no está implementada.',
        )
      }

      /*
       * La generación ocurre completamente en el navegador
       * utilizando Web Crypto API a través de EcdsaProvider.
       */
      const provider = new EcdsaProvider()

      const keyPair =
        await provider.generateKeyPair()

      const privateKeyPem =
        await provider.exportPrivateKey(
          keyPair.privateKey,
        )

      const publicKeyPem =
        await provider.exportPublicKey(
          keyPair.publicKey,
        )

      setGeneratedKeys({
        algorithm,
        privateKeyPem,
        publicKeyPem,
        generatedAt: new Date(),
      })

    } catch (err) {
      console.error(
        'Error generando llaves:',
        err,
      )

      setError(
        err instanceof Error
          ? err.message
          : 'No fue posible generar las llaves.',
      )
    } finally {
      setGenerating(false)
    }
  }

  const handleGenerate = () => {
    setError('')

    /*
     * Si ya existe un par de llaves, no lo reemplazamos
     * directamente.
     */
    if (generatedKeys) {
      setShowRegenerateWarning(true)
      return
    }

    generateKeys()
  }

  const confirmRegenerate = async () => {
    setShowRegenerateWarning(false)

    /*
     * Eliminamos de memoria el estado del par anterior.
     * Las copias descargadas por el usuario siguen siendo
     * responsabilidad del usuario.
     */
    setGeneratedKeys(null)

    await generateKeys()
  }

  const downloadFile = (
    filename: string,
    content: string,
  ) => {
    const blob = new Blob(
      [content],
      {
        type: 'application/x-pem-file',
      },
    )

    const url =
      URL.createObjectURL(blob)

    const link =
      document.createElement('a')

    link.href = url
    link.download = filename

    document.body.appendChild(link)

    link.click()

    link.remove()

    URL.revokeObjectURL(url)
  }

  const downloadPrivateKey = () => {
    if (!generatedKeys) return

    downloadFile(
      'private_key.pem',
      generatedKeys.privateKeyPem,
    )
  }

  const downloadPublicKey = () => {
    if (!generatedKeys) return

    downloadFile(
      'public_key.pem',
      generatedKeys.publicKeyPem,
    )
  }

  const formatDate = (date: Date) => {
    return date.toLocaleString('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: '#f0f5fe',
      }}
    >
      <div className="max-w-5xl mx-auto px-6 py-12">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="mb-8">

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="mono text-xs mb-5"
              style={{
                color: '#3b6fd4',
              }}
            >
              ← Volver
            </button>
          )}

          <p
            className="mono text-xs font-semibold tracking-widest uppercase mb-2"
            style={{
              color: '#10b981',
            }}
          >
            Gestión criptográfica
          </p>

          <h1
            className="text-3xl font-semibold"
            style={{
              color: '#0a1628',
            }}
          >
            Mis llaves
          </h1>

          <p
            className="mt-2 text-sm"
            style={{
              color: '#3b6fd4',
            }}
          >
            Genera y administra tu par de llaves
            criptográficas localmente.
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


        {/* =====================================================
            GENERATED STATUS
        ===================================================== */}

        {generatedKeys && (
          <div
            className="mb-6 rounded-xl p-4 flex items-center gap-3"
            style={{
              backgroundColor:
                'rgba(16,185,129,0.07)',
              border:
                '1px solid rgba(16,185,129,0.25)',
            }}
          >

            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: '#10b981',
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

              <p
                className="font-semibold text-sm"
                style={{
                  color: '#065f46',
                }}
              >
                Llaves generadas correctamente
              </p>

              <p
                className="text-xs mt-0.5"
                style={{
                  color: '#059669',
                }}
              >
                ECDSA P-256 · Generadas localmente el{' '}
                {formatDate(
                  generatedKeys.generatedAt,
                )}
              </p>

            </div>

          </div>
        )}


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* =====================================================
              ALGORITHM
          ===================================================== */}

          <div>

            <div
              className="bg-white rounded-2xl p-5"
              style={{
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
                Algoritmo
              </p>


              {/* ECDSA */}

              <button
                type="button"
                onClick={() =>
                  !generatedKeys &&
                  setAlgorithm('ECDSA_P256')
                }
                disabled={!!generatedKeys}
                className="w-full text-left rounded-xl p-4 mb-3"
                style={{
                  backgroundColor:
                    isEcdsa
                      ? 'rgba(36,80,164,0.06)'
                      : 'white',

                  border:
                    isEcdsa
                      ? '1.5px solid #2450a4'
                      : '1px solid #dce8fd',

                  opacity:
                    generatedKeys && !isEcdsa
                      ? 0.5
                      : 1,

                  cursor:
                    generatedKeys
                      ? 'not-allowed'
                      : 'pointer',
                }}
              >

                <div className="flex items-start gap-3">

                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor:
                        'rgba(36,80,164,0.08)',
                    }}
                  >
                    <ShieldIcon
                      className="w-5 h-5"
                      style={{
                        color: '#2450a4',
                      }}
                    />
                  </div>

                  <div className="flex-1">

                    <div className="flex items-center justify-between">

                      <p
                        className="font-semibold text-sm"
                        style={{
                          color: '#0a1628',
                        }}
                      >
                        ECDSA P-256
                      </p>

                      {isEcdsa && (
                        <CheckIcon
                          className="w-4 h-4"
                          style={{
                            color: '#10b981',
                          }}
                        />
                      )}

                    </div>

                    <p
                      className="mono text-[10px] mt-1"
                      style={{
                        color: '#6b98e8',
                      }}
                    >
                      NIST P-256 · SHA-256
                    </p>

                    <span
                      className="inline-block mono text-[9px] mt-2 px-2 py-1 rounded"
                      style={{
                        backgroundColor:
                          'rgba(16,185,129,0.08)',
                        color: '#059669',
                      }}
                    >
                      DISPONIBLE
                    </span>

                  </div>

                </div>

              </button>


              {/* ML-DSA */}

              <button
                type="button"
                disabled
                className="w-full text-left rounded-xl p-4"
                style={{
                  backgroundColor: 'white',
                  border:
                    '1px solid #dce8fd',
                  opacity: 0.55,
                  cursor: 'not-allowed',
                }}
              >

                <div className="flex items-start gap-3">

                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor:
                        'rgba(5,150,105,0.08)',
                    }}
                  >
                    <LockIcon
                      className="w-5 h-5"
                      style={{
                        color: '#059669',
                      }}
                    />
                  </div>

                  <div className="flex-1">

                    <p
                      className="font-semibold text-sm"
                      style={{
                        color: '#0a1628',
                      }}
                    >
                      ML-DSA-65
                    </p>

                    <p
                      className="mono text-[10px] mt-1"
                      style={{
                        color: '#6b98e8',
                      }}
                    >
                      Post-Quantum · FIPS 204
                    </p>

                    <span
                      className="inline-block mono text-[9px] mt-2 px-2 py-1 rounded"
                      style={{
                        backgroundColor:
                          'rgba(245,158,11,0.08)',
                        color: '#b45309',
                      }}
                    >
                      PRÓXIMAMENTE
                    </span>

                  </div>

                </div>

              </button>


              {/* =================================================
                  GENERATE BUTTON
              ================================================= */}

              {!generatedKeys && (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating || !isEcdsa}
                  className="w-full mt-5 py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                  style={{
                    backgroundColor:
                      generating || !isEcdsa
                        ? '#c7d8f5'
                        : '#0a1628',

                    color: 'white',

                    cursor:
                      generating || !isEcdsa
                        ? 'not-allowed'
                        : 'pointer',
                  }}
                >

                  {generating ? (
                    <>
                      <div
                        className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"
                      />

                      Generando...
                    </>
                  ) : (
                    <>
                      <LockIcon className="w-4 h-4" />

                      Generar par de llaves
                    </>
                  )}

                </button>
              )}


              {/* =================================================
                  ALREADY GENERATED
              ================================================= */}

              {generatedKeys && (
                <div className="mt-5">

                  <div
                    className="rounded-xl p-4"
                    style={{
                      backgroundColor:
                        '#f0f5fe',
                      border:
                        '1px solid #dce8fd',
                    }}
                  >

                    <p
                      className="text-xs font-semibold"
                      style={{
                        color: '#162c5e',
                      }}
                    >
                      Ya tienes un par de llaves
                    </p>

                    <p
                      className="text-xs mt-1 leading-relaxed"
                      style={{
                        color: '#3b6fd4',
                      }}
                    >
                      Conserva estas llaves. Son las que
                      utilizarás junto con tu certificado
                      para firmar documentos.
                    </p>

                  </div>


                  <button
                    type="button"
                    onClick={handleGenerate}
                    className="w-full mt-3 py-3 rounded-xl text-sm font-semibold"
                    style={{
                      backgroundColor:
                        'white',
                      color: '#dc2626',
                      border:
                        '1px solid rgba(220,38,38,0.3)',
                    }}
                  >
                    Generar nuevas llaves
                  </button>

                </div>
              )}

            </div>

          </div>


          {/* =====================================================
              KEY RESULTS
          ===================================================== */}

          <div className="lg:col-span-2">

            {!generatedKeys ? (

              <div
                className="min-h-[430px] bg-white rounded-2xl flex flex-col items-center justify-center text-center p-8"
                style={{
                  border:
                    '1px solid #dce8fd',
                }}
              >

                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                  style={{
                    backgroundColor:
                      '#f0f5fe',
                  }}
                >
                  <ShieldIcon
                    className="w-8 h-8"
                    style={{
                      color: '#6b98e8',
                    }}
                  />
                </div>

                <h2
                  className="text-lg font-semibold"
                  style={{
                    color: '#0a1628',
                  }}
                >
                  Aún no tienes llaves
                </h2>

                <p
                  className="text-sm mt-2 max-w-md"
                  style={{
                    color: '#6b98e8',
                  }}
                >
                  Genera tu par de llaves para comenzar
                  a utilizar tu identidad criptográfica.
                </p>

              </div>

            ) : (

              <div className="space-y-4">

                {/* =================================================
                    PRIVATE KEY
                ================================================= */}

                <KeyCard
                  title="Llave privada"
                  filename="private_key.pem"
                  pem={generatedKeys.privateKeyPem}
                  dangerous
                  onDownload={downloadPrivateKey}
                />


                {/* =================================================
                    PUBLIC KEY
                ================================================= */}

                <KeyCard
                  title="Llave pública"
                  filename="public_key.pem"
                  pem={generatedKeys.publicKeyPem}
                  onDownload={downloadPublicKey}
                />


                {/* =================================================
                    SECURITY MESSAGE
                ================================================= */}

                <div
                  className="rounded-xl p-4 flex items-start gap-3"
                  style={{
                    backgroundColor:
                      '#fffbeb',
                    border:
                      '1px solid #fcd34d',
                  }}
                >

                  <LockIcon
                    className="w-5 h-5 flex-shrink-0"
                    style={{
                      color: '#d97706',
                    }}
                  />

                  <div>

                    <p
                      className="text-sm font-semibold"
                      style={{
                        color: '#92400e',
                      }}
                    >
                      Protege tu llave privada
                    </p>

                    <p
                      className="text-xs mt-1 leading-relaxed"
                      style={{
                        color: '#b45309',
                      }}
                    >
                      La llave privada se genera localmente
                      en tu navegador y no se envía al servidor.
                      Descárgala y guárdala en un lugar seguro.
                    </p>

                  </div>

                </div>


                {/* =================================================
                    NEXT STEP
                ================================================= */}

                <div
                  className="rounded-xl p-5"
                  style={{
                    backgroundColor:
                      'rgba(36,80,164,0.05)',
                    border:
                      '1px solid rgba(36,80,164,0.15)',
                  }}
                >

                  <div className="flex items-start gap-3">

                    <ShieldIcon
                      className="w-5 h-5 flex-shrink-0"
                      style={{
                        color: '#2450a4',
                      }}
                    />

                    <div>

                      <p
                        className="text-sm font-semibold"
                        style={{
                          color: '#162c5e',
                        }}
                      >
                        Siguiente paso
                      </p>

                      <p
                        className="text-xs mt-1 leading-relaxed"
                        style={{
                          color: '#3b6fd4',
                        }}
                      >
                        Utiliza este par de llaves para
                        solicitar tu certificado digital.
                        El certificado quedará asociado
                        a esta llave pública.
                      </p>

                    </div>

                  </div>

                </div>

              </div>

            )}

          </div>

        </div>

      </div>


      {/* =========================================================
          REGENERATE CONFIRMATION MODAL
      ========================================================= */}

      {showRegenerateWarning && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{
            backgroundColor:
              'rgba(5,13,26,0.65)',
          }}
        >

          <div
            className="w-full max-w-lg rounded-2xl p-6"
            style={{
              backgroundColor: 'white',
              boxShadow:
                '0 25px 60px rgba(0,0,0,0.25)',
            }}
          >

            {/* Icon */}

            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
              style={{
                backgroundColor:
                  'rgba(220,38,38,0.08)',
              }}
            >
              <LockIcon
                className="w-6 h-6"
                style={{
                  color: '#dc2626',
                }}
              />
            </div>


            <h2
              className="text-xl font-semibold"
              style={{
                color: '#0a1628',
              }}
            >
              ¿Generar nuevas llaves?
            </h2>


            <p
              className="text-sm mt-3 leading-relaxed"
              style={{
                color: '#3b6fd4',
              }}
            >
              Estás a punto de reemplazar tu par de
              llaves actual.
            </p>


            <div
              className="rounded-xl p-4 mt-4"
              style={{
                backgroundColor:
                  '#fff7ed',
                border:
                  '1px solid #fed7aa',
              }}
            >

              <p
                className="text-sm font-semibold"
                style={{
                  color: '#9a3412',
                }}
              >
                ⚠ El certificado actual no corresponderá
                a las nuevas llaves
              </p>

              <p
                className="text-xs mt-2 leading-relaxed"
                style={{
                  color: '#c2410c',
                }}
              >
                El certificado digital actual está
                asociado a la llave pública que tienes
                actualmente. Si generas un nuevo par,
                tendrás que solicitar un nuevo certificado
                para utilizar las nuevas llaves.
              </p>

            </div>


            <div
              className="rounded-xl p-4 mt-3"
              style={{
                backgroundColor:
                  '#f8fbff',
                border:
                  '1px solid #dce8fd',
              }}
            >

              <p
                className="text-xs leading-relaxed"
                style={{
                  color: '#3b6fd4',
                }}
              >
                Las firmas PDF realizadas anteriormente
                no se invalidan por generar una nueva llave.
                Sin embargo, deberás conservar el certificado
                correspondiente a esas firmas para poder
                verificarlas correctamente.
              </p>

            </div>


            {/* Actions */}

            <div className="flex gap-3 mt-6">

              <button
                type="button"
                onClick={() =>
                  setShowRegenerateWarning(false)
                }
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{
                  backgroundColor:
                    '#f0f5fe',
                  color: '#2450a4',
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmRegenerate}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{
                  backgroundColor:
                    '#dc2626',
                  color: 'white',
                }}
              >
                Generar nuevas llaves
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  )
}


/* ===============================================================
   KEY CARD
=============================================================== */

function KeyCard({
  title,
  filename,
  pem,
  dangerous = false,
  onDownload,
}: {
  title: string
  filename: string
  pem: string
  dangerous?: boolean
  onDownload: () => void
}) {
  return (
    <div
      className="bg-white rounded-2xl p-5"
      style={{
        border: dangerous
          ? '1px solid rgba(220,38,38,0.25)'
          : '1px solid #dce8fd',
      }}
    >

      <div className="flex items-center justify-between gap-4 mb-4">

        <div>

          <p
            className="font-semibold text-sm"
            style={{
              color: '#0a1628',
            }}
          >
            {title}
          </p>

          <p
            className="mono text-[10px] mt-1"
            style={{
              color: dangerous
                ? '#dc2626'
                : '#6b98e8',
            }}
          >
            {filename}
          </p>

        </div>


        <button
          type="button"
          onClick={onDownload}
          className="px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 flex-shrink-0"
          style={{
            backgroundColor:
              dangerous
                ? '#dc2626'
                : '#2450a4',
            color: 'white',
          }}
        >
          <DownloadIcon className="w-4 h-4" />
          Descargar
        </button>

      </div>


      <pre
        className="rounded-xl p-4 overflow-auto text-[10px] leading-relaxed"
        style={{
          backgroundColor:
            '#f8fbff',
          border:
            '1px solid #eef4fc',
          color:
            '#3b6fd4',
          maxHeight:
            '170px',
        }}
      >
        {pem}
      </pre>

    </div>
  )
}