import { useMemo, useState } from 'react'
import {
  exportEncryptedPrivateKey,
  generateBrowserKeyPair,
  type BrowserGeneratedKeyPair,
  type ClientAlgorithm,
} from '../crypto'
import { CheckIcon, DownloadIcon, LockIcon, ShieldIcon } from './icons'

interface KeysPageProps {
  userEmail: string
  onBack?: () => void
}

interface GeneratedKeys {
  pair: BrowserGeneratedKeyPair
  generatedAt: Date
}

interface KeyMetadata {
  generatedAt: string
}

type GeneratedByAlgorithm = Partial<Record<ClientAlgorithm, GeneratedKeys>>
type MetadataByAlgorithm = Partial<Record<ClientAlgorithm, KeyMetadata>>

const ALGORITHMS: Array<{
  id: ClientAlgorithm
  name: string
  detail: string
  accent: string
}> = [
  {
    id: 'ECDSA_P256',
    name: 'ECDSA P-256',
    detail: 'NIST P-256 · SHA-256',
    accent: '#2450a4',
  },
  {
    id: 'ML_DSA_65',
    name: 'ML-DSA-65',
    detail: 'Post-Quantum · FIPS 204',
    accent: '#059669',
  },
]

function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/x-pem-file' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function metadataStorageKey(userEmail: string) {
  return `signpdf_key_metadata:${encodeURIComponent(userEmail || 'anonymous')}`
}

function loadMetadata(userEmail: string): MetadataByAlgorithm {
  try {
    const raw = localStorage.getItem(metadataStorageKey(userEmail))
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function KeysPage({ userEmail, onBack }: KeysPageProps) {
  const [algorithm, setAlgorithm] = useState<ClientAlgorithm>('ECDSA_P256')
  const [generatedByAlgorithm, setGeneratedByAlgorithm] = useState<GeneratedByAlgorithm>({})
  const [metadata, setMetadata] = useState<MetadataByAlgorithm>(() => loadMetadata(userEmail))
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [generating, setGenerating] = useState(false)
  const [protecting, setProtecting] = useState(false)
  const [error, setError] = useState('')

  const selected = ALGORITHMS.find(item => item.id === algorithm)!
  const generated = generatedByAlgorithm[algorithm] ?? null
  const selectedMetadata = metadata[algorithm]

  const generatedCount = useMemo(
    () => ALGORITHMS.filter(item => metadata[item.id]).length,
    [metadata],
  )

  const persistMetadata = (next: MetadataByAlgorithm) => {
    setMetadata(next)
    localStorage.setItem(metadataStorageKey(userEmail), JSON.stringify(next))
  }

  const generateKeys = async () => {
    setGenerating(true)
    setError('')
    setPassword('')
    setPasswordConfirm('')

    try {
      const existing = generatedByAlgorithm[algorithm]
      if (
        existing?.pair.algorithm === 'ML_DSA_65' &&
        existing.pair.privateMaterial instanceof Uint8Array
      ) {
        existing.pair.privateMaterial.fill(0)
      }

      const pair = await generateBrowserKeyPair(algorithm)
      const generatedAt = new Date()
      setGeneratedByAlgorithm(current => ({
        ...current,
        [algorithm]: { pair, generatedAt },
      }))
      persistMetadata({
        ...metadata,
        [algorithm]: { generatedAt: generatedAt.toISOString() },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible generar las llaves.')
    } finally {
      setGenerating(false)
    }
  }

  const regenerate = async () => {
    if (!window.confirm(`Se generará un nuevo par ${selected.name}. El par anterior no podrá recuperarse. ¿Continuar?`)) return
    await generateKeys()
  }

  const downloadPrivate = async () => {
    if (!generated) return
    setError('')

    if (password.length < 8) {
      setError('La contraseña de la llave debe tener al menos 8 caracteres.')
      return
    }
    if (password !== passwordConfirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setProtecting(true)
    try {
      const protectedPem = await exportEncryptedPrivateKey(generated.pair, password)
      const prefix = generated.pair.algorithm === 'ECDSA_P256' ? 'ecdsa' : 'mldsa65'
      downloadFile(`${prefix}_private_key_encrypted.pem`, protectedPem)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible proteger la llave privada.')
    } finally {
      setProtecting(false)
    }
  }

  const downloadPublic = () => {
    if (!generated) return
    const prefix = generated.pair.algorithm === 'ECDSA_P256' ? 'ecdsa' : 'mldsa65'
    downloadFile(`${prefix}_public_key.pem`, generated.pair.publicKeyPem)
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0f5fe' }}>
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8">
          {onBack && (
            <button type="button" onClick={onBack} className="mono text-xs mb-5" style={{ color: '#3b6fd4' }}>
              ← Volver
            </button>
          )}
          <p className="mono text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#10b981' }}>
            Gestión criptográfica
          </p>
          <h1 className="text-3xl font-semibold" style={{ color: '#0a1628' }}>Mis llaves</h1>
          <p className="mt-2 text-sm" style={{ color: '#3b6fd4' }}>
            Genera ECDSA P-256 o ML-DSA-65 en tu navegador. La llave privada nunca se envía al servidor.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl p-4" style={{ backgroundColor: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', color: '#991b1b' }}>
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #dce8fd' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="mono text-xs font-semibold tracking-wide uppercase" style={{ color: '#162c5e' }}>Algoritmo</p>
              {generatedCount > 0 && <span className="mono text-[9px]" style={{ color: '#059669' }}>{generatedCount}/2 GENERADOS</span>}
            </div>

            {ALGORITHMS.map(item => {
              const active = item.id === algorithm
              const itemMetadata = metadata[item.id]
              const itemInMemory = generatedByAlgorithm[item.id]
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    setAlgorithm(item.id)
                    setError('')
                    setPassword('')
                    setPasswordConfirm('')
                  }}
                  className="w-full text-left rounded-xl p-4 mb-3"
                  style={{
                    backgroundColor: active ? `${item.accent}10` : 'white',
                    border: active ? `1.5px solid ${item.accent}` : '1px solid #dce8fd',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${item.accent}12` }}>
                      {item.id === 'ECDSA_P256' ? <ShieldIcon className="w-5 h-5" style={{ color: item.accent }} /> : <LockIcon className="w-5 h-5" style={{ color: item.accent }} />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm" style={{ color: '#0a1628' }}>{item.name}</p>
                        {(active || itemMetadata) && <CheckIcon className="w-4 h-4" style={{ color: itemMetadata ? '#10b981' : '#6b98e8' }} />}
                      </div>
                      <p className="mono text-[10px] mt-1" style={{ color: '#6b98e8' }}>{item.detail}</p>
                      <span className="inline-block mono text-[9px] mt-2 px-2 py-1 rounded" style={{ backgroundColor: itemMetadata ? 'rgba(16,185,129,0.10)' : 'rgba(59,111,212,0.08)', color: itemMetadata ? '#059669' : '#3b6fd4' }}>
                        {itemMetadata ? (itemInMemory ? 'GENERADA · EN MEMORIA' : 'GENERADA') : 'DISPONIBLE'}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}

            <button
              type="button"
              disabled={generating}
              onClick={generated || selectedMetadata ? regenerate : generateKeys}
              className="w-full mt-3 py-3.5 rounded-xl font-semibold text-sm"
              style={{ backgroundColor: generating ? '#c7d8f5' : '#0a1628', color: 'white' }}
            >
              {generating ? 'Generando...' : generated || selectedMetadata ? `Generar nuevas llaves ${selected.name}` : 'Generar par de llaves'}
            </button>
          </div>

          <div className="lg:col-span-2">
            {!generated ? (
              <div className="min-h-[430px] bg-white rounded-2xl flex flex-col items-center justify-center text-center p-8" style={{ border: '1px solid #dce8fd' }}>
                {selectedMetadata ? <CheckIcon className="w-12 h-12 mb-4" style={{ color: '#10b981' }} /> : <ShieldIcon className="w-12 h-12 mb-4" style={{ color: '#6b98e8' }} />}
                <h2 className="text-lg font-semibold" style={{ color: '#0a1628' }}>
                  {selectedMetadata ? `Ya generaste llaves ${selected.name}` : `Aún no has generado llaves ${selected.name}`}
                </h2>
                <p className="text-sm mt-2 max-w-lg" style={{ color: '#6b98e8' }}>
                  {selectedMetadata
                    ? `Registro local: ${new Date(selectedMetadata.generatedAt).toLocaleString('es-MX')}. Por seguridad, el material privado no se conserva al salir de esta pantalla; usa los archivos que descargaste o genera un nuevo par.`
                    : 'Genera el par localmente. Podrás proteger la llave privada con contraseña y descargar ambas llaves.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #dce8fd' }}>
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                      <h2 className="font-semibold" style={{ color: '#0a1628' }}>Llave pública</h2>
                      <p className="text-xs mt-1" style={{ color: '#6b98e8' }}>{selected.name} · SPKI PEM</p>
                    </div>
                    <button type="button" onClick={downloadPublic} className="px-4 py-2 rounded-lg text-sm font-semibold flex gap-2 items-center" style={{ backgroundColor: '#eef4ff', color: '#2450a4' }}>
                      <DownloadIcon className="w-4 h-4" /> Descargar
                    </button>
                  </div>
                  <pre className="text-[10px] overflow-hidden whitespace-pre-wrap break-all rounded-xl p-3" style={{ backgroundColor: '#f8fbff', color: '#597bb8' }}>
                    {generated.pair.publicKeyPem.slice(0, 360)}{generated.pair.publicKeyPem.length > 360 ? '\n…' : ''}
                  </pre>
                </div>

                <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #dce8fd' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <LockIcon className="w-5 h-5" style={{ color: '#d97706' }} />
                    <div>
                      <h2 className="font-semibold" style={{ color: '#0a1628' }}>Llave privada protegida</h2>
                      <p className="text-xs mt-1" style={{ color: '#6b98e8' }}>La contraseña se usa solo en este navegador y no se envía al backend.</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3 mb-4">
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Contraseña (mín. 8 caracteres)"
                      autoComplete="new-password"
                      className="rounded-xl px-4 py-3 text-sm outline-none"
                      style={{ border: '1px solid #c7d8f5' }}
                    />
                    <input
                      type="password"
                      value={passwordConfirm}
                      onChange={e => setPasswordConfirm(e.target.value)}
                      placeholder="Confirmar contraseña"
                      autoComplete="new-password"
                      className="rounded-xl px-4 py-3 text-sm outline-none"
                      style={{ border: '1px solid #c7d8f5' }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={downloadPrivate}
                    disabled={protecting}
                    className="w-full py-3 rounded-xl font-semibold text-sm flex gap-2 justify-center items-center"
                    style={{ backgroundColor: '#0a1628', color: 'white' }}
                  >
                    <DownloadIcon className="w-4 h-4" />
                    {protecting ? 'Protegiendo...' : 'Proteger y descargar llave privada'}
                  </button>

                  <p className="text-xs mt-4 leading-relaxed" style={{ color: '#92400e' }}>
                    Guarda la contraseña: será necesaria para crear la CSR y para firmar PDFs. SignPDF no puede recuperarla.
                  </p>
                </div>

                <div className="rounded-xl p-4 flex items-start gap-3" style={{ backgroundColor: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.25)' }}>
                  <CheckIcon className="w-5 h-5" style={{ color: '#059669' }} />
                  <p className="text-sm" style={{ color: '#065f46' }}>
                    {selected.name} generado localmente el {generated.generatedAt.toLocaleString('es-MX')}. Puedes cambiar de algoritmo y generar el segundo par sin perder este estado de la pantalla.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
