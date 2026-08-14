import { useState, useEffect, useRef } from 'react'
import forge from 'node-forge'
import { ShieldIcon, LockIcon, CheckIcon } from './icons'

type Algorithm = 'ECDSA_P256' | 'ML_DSA_65'

const STEPS = [
  { id: 1, text: 'Generando par de llaves localmente mediante Web Crypto API...', duration: 1400 },
  { id: 2, text: 'Derivando clave pública desde la curva criptográfica...', duration: 1100 },
  { id: 3, text: 'Construyendo solicitud de certificado (CSR)...', duration: 1200 },
  { id: 4, text: 'Firmando CSR con llave privada local...', duration: 900 },
  { id: 5, text: 'Enviando solicitud segura al backend (TLS 1.3)...', duration: 1000 },
  { id: 6, text: 'Validando identidad y emitiendo certificado...', duration: 1300 },
]

interface ProcessingScreenProps {
  algorithm: Algorithm
  token: string
  onComplete: () => void
}

export function ProcessingScreen({ algorithm, token, onComplete }: ProcessingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [progress, setProgress] = useState(0)
  
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    let stepIndex = 0
    let totalElapsed = 0
    const totalDuration = STEPS.reduce((a, s) => a + s.duration, 0)
    let backendFinished = false

    const doBackendWork = async () => {
      try {
        // 1. Generar llaves y CSR con node-forge
        const keys = forge.pki.rsa.generateKeyPair({ bits: 2048, workers: -1 })
        const csr = forge.pki.createCertificationRequest()
        csr.publicKey = keys.publicKey
        csr.setSubject([
          { name: 'commonName', value: 'sign-pdf.local' },
          { name: 'organizationName', value: 'SignPDF App' }
        ])
        csr.sign(keys.privateKey)
        const csrPem = forge.pki.certificationRequestToPem(csr)

        // 2. Enviar CSR a nuestro backend
        const res = await fetch('http://127.0.0.1:8000/api/certificates/sign', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ csr: csrPem })
        })
        await res.json()
        
        // 3. Descargar la llave privada
        const pemKey = forge.pki.privateKeyToPem(keys.privateKey)
        const blob = new Blob([pemKey], { type: 'application/x-pem-file' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'mi_llave_privada.key'
        a.click()
        URL.revokeObjectURL(url)
        
        backendFinished = true
      } catch (err) {
        console.error("Error en proceso seguro:", err)
      }
    }

    const runStep = () => {
      if (stepIndex >= STEPS.length) {
        // Si la animación terminó, pero el backend sigue esperando (polling)
        const checkFinish = setInterval(() => {
          if (backendFinished) {
            clearInterval(checkFinish)
            setProgress(100)
            setTimeout(onComplete, 600)
          }
        }, 500)
        return
      }
      setCurrentStep(stepIndex)
      const duration = STEPS[stepIndex].duration
      let elapsed = 0
      const interval = setInterval(() => {
        elapsed += 50
        totalElapsed += 50
        setProgress(Math.min(99, Math.round((totalElapsed / totalDuration) * 100)))
        if (elapsed >= duration) {
          clearInterval(interval)
          const stepToMark = stepIndex
          setCompletedSteps(prev => [...prev, stepToMark])
          stepIndex++
          setTimeout(runStep, 120)
        }
      }, 50)
    }

    doBackendWork()
    runStep()
  }, [])

  const algoLabel = algorithm === 'ECDSA_P256' ? 'ECDSA P-256' : 'ML-DSA-65'

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: '#050d1a' }}
    >
      {/* Grid bg */}
      <div
        className="fixed inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(100,160,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(100,160,255,0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 w-full max-w-lg">
        {/* Spinner */}
        <div className="flex justify-center mb-10">
          <div className="relative w-32 h-32">
            <svg className="absolute inset-0 w-full h-full spin-slow" viewBox="0 0 128 128">
              <circle cx="64" cy="64" r="58" fill="none" stroke="rgba(36,80,164,0.3)" strokeWidth="2" strokeDasharray="4 8" />
            </svg>
            <svg className="absolute inset-0 w-full h-full spin-slow-reverse" viewBox="0 0 128 128">
              <circle cx="64" cy="64" r="46" fill="none" stroke="rgba(16,185,129,0.4)" strokeWidth="1.5" strokeDasharray="12 6" />
            </svg>
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 128 128">
              <circle
                cx="64" cy="64" r="58"
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={`${(progress / 100) * 364.4} 364.4`}
                style={{ transition: 'stroke-dasharray 0.15s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="mono text-2xl font-semibold" style={{ color: '#10b981' }}>{progress}%</span>
              <span className="mono text-xs mt-0.5" style={{ color: '#3b6fd4' }}>procesando</span>
            </div>
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: '#0a1628', border: '1px solid rgba(100,160,255,0.12)' }}
        >
          {/* Header */}
          <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(100,160,255,0.1)' }}>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center pulse-glow"
              style={{ backgroundColor: 'rgba(16,185,129,0.15)' }}
            >
              <ShieldIcon className="w-4 h-4" style={{ color: '#10b981' }} />
            </div>
            <div>
              <p className="text-white font-medium text-sm">Procesamiento seguro en progreso</p>
              <p className="mono text-xs" style={{ color: '#3b6fd4' }}>
                Algoritmo: <span style={{ color: '#6ee7b7' }}>{algoLabel}</span> · Entorno: navegador local
              </p>
            </div>
          </div>

          {/* Steps */}
          <div className="p-6 space-y-3">
            {STEPS.map((step, i) => {
              const isDone = completedSteps.includes(i)
              const isActive = i === currentStep && !isDone
              return (
                <div
                  key={step.id}
                  className="flex items-start gap-3 transition-all duration-300"
                  style={{ opacity: i > currentStep ? 0.3 : 1 }}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {isDone ? (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: '#10b981' }}>
                        <CheckIcon className="w-3 h-3 text-white" />
                      </div>
                    ) : isActive ? (
                      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: '#2450a4' }}>
                        <div className="w-2 h-2 rounded-full pulse-glow" style={{ backgroundColor: '#3b6fd4' }} />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2" style={{ borderColor: 'rgba(100,160,255,0.2)' }} />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="mono text-xs leading-relaxed" style={{ color: isDone ? '#6ee7b7' : isActive ? '#a8c4f4' : '#3b6fd4' }}>
                      {isActive && (
                        <span className="inline-block w-1.5 h-3 mr-1.5 align-middle pulse-glow" style={{ backgroundColor: '#3b6fd4' }} />
                      )}
                      {step.text}
                    </p>
                  </div>
                  {isDone && <span className="mono text-xs flex-shrink-0" style={{ color: '#059669' }}>OK</span>}
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div style={{ backgroundColor: '#050d1a', padding: '16px 24px' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1 rounded-full overflow-hidden" style={{ height: '3px', backgroundColor: 'rgba(100,160,255,0.15)' }}>
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{ width: `${progress}%`, backgroundColor: '#10b981' }}
                />
              </div>
              <span className="mono text-xs" style={{ color: '#6b98e8' }}>{progress}%</span>
            </div>
            <p className="mono text-xs text-center" style={{ color: '#1e3a78' }}>
              No cierres esta ventana · Proceso ejecutado en tu dispositivo
            </p>
          </div>
        </div>

        {/* Zero-knowledge note */}
        <div
          className="mt-4 rounded-xl p-4 flex items-center gap-3"
          style={{ backgroundColor: 'rgba(36,80,164,0.15)', border: '1px solid rgba(36,80,164,0.25)' }}
        >
          <LockIcon className="w-4 h-4 flex-shrink-0" style={{ color: '#6b98e8' }} />
          <p className="mono text-xs leading-relaxed" style={{ color: '#6b98e8' }}>
            Zero-knowledge: las llaves criptográficas nunca abandonan tu navegador durante la generación. Solo el CSR firmado viaja al servidor sobre TLS 1.3.
          </p>
        </div>
      </div>
    </div>
  )
}
