import { useState, useEffect, useRef } from 'react'
import { AuthLayout } from './AuthLayout'
import { CheckIcon, EnvelopeIcon } from './icons'

interface OtpScreenProps {
  email: string
  onVerified: () => void
  onBack: () => void
}

const OTP_DEMO = '847291'
const OTP_LENGTH = 6
const TIMER_SECONDS = 60

export function OtpScreen({ email, onVerified, onBack }: OtpScreenProps) {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [verified, setVerified] = useState(false)
  const [timer, setTimer] = useState(TIMER_SECONDS)
  const [resent, setResent] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Countdown
  useEffect(() => {
    if (timer <= 0) return
    const id = setInterval(() => setTimer(t => t - 1), 1000)
    return () => clearInterval(id)
  }, [timer])

  const focusInput = (i: number) => {
    inputRefs.current[i]?.focus()
  }

  const handleChange = (i: number, value: string) => {
    // Allow only digits
    const digit = value.replace(/\D/g, '').slice(-1)
    setError('')
    const next = [...digits]
    next[i] = digit
    setDigits(next)
    if (digit && i < OTP_LENGTH - 1) {
      focusInput(i + 1)
    }
    // Auto-submit when complete
    if (digit && i === OTP_LENGTH - 1) {
      const code = [...next.slice(0, -1), digit].join('')
      if (code.length === OTP_LENGTH) submitCode(code)
    }
  }

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const next = [...digits]
      if (next[i]) {
        next[i] = ''
        setDigits(next)
      } else if (i > 0) {
        next[i - 1] = ''
        setDigits(next)
        focusInput(i - 1)
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      focusInput(i - 1)
    } else if (e.key === 'ArrowRight' && i < OTP_LENGTH - 1) {
      focusInput(i + 1)
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    const next = Array(OTP_LENGTH).fill('')
    pasted.split('').forEach((ch, i) => { next[i] = ch })
    setDigits(next)
    const filled = pasted.length
    focusInput(Math.min(filled, OTP_LENGTH - 1))
    if (pasted.length === OTP_LENGTH) submitCode(pasted)
  }

  const submitCode = (code: string) => {
    setLoading(true)
    setError('')
    setTimeout(() => {
      setLoading(false)
      if (code === OTP_DEMO) {
        setVerified(true)
        setTimeout(onVerified, 1400)
      } else {
        setError('Código incorrecto. Verifica e intenta de nuevo.')
        setDigits(Array(OTP_LENGTH).fill(''))
        setTimeout(() => focusInput(0), 50)
      }
    }, 900)
  }

  const handleManualSubmit = () => {
    const code = digits.join('')
    if (code.length < OTP_LENGTH) {
      setError('Por favor ingresa los 6 dígitos del código.')
      return
    }
    submitCode(code)
  }

  const handleResend = () => {
    setTimer(TIMER_SECONDS)
    setResent(true)
    setDigits(Array(OTP_LENGTH).fill(''))
    setError('')
    setTimeout(() => focusInput(0), 50)
    setTimeout(() => setResent(false), 3000)
  }

  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + '*'.repeat(b.length) + c)

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <AuthLayout
      step={2}
      totalSteps={4}
      heading={<>Verifica tu <span className="font-semibold">identidad</span></>}
      subheading="La autenticación en dos pasos protege tu cuenta ante accesos no autorizados."
    >
      {verified ? (
        /* ── Success state ── */
        <div className="flex flex-col items-center py-8 fade-in-up">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
            style={{ backgroundColor: 'rgba(16,185,129,0.12)', border: '2px solid #10b981' }}
          >
            <CheckIcon className="w-10 h-10" style={{ color: '#10b981' }} />
          </div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: '#0a1628' }}>
            Identidad verificada
          </h2>
          <p className="text-sm text-center" style={{ color: '#3b6fd4' }}>
            Redirigiendo a la selección de algoritmo...
          </p>
          <div className="flex gap-1 mt-5">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2 h-2 rounded-full pulse-glow"
                style={{ backgroundColor: '#10b981', animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      ) : (
        /* ── OTP entry ── */
        <>
          <div className="mb-7">
            <h2 className="text-2xl font-semibold mb-1" style={{ color: '#0a1628' }}>
              Verificación en dos pasos
            </h2>
            <p className="text-sm" style={{ color: '#3b6fd4' }}>
              Ingresa el código de 6 dígitos enviado a tu correo
            </p>
          </div>

          {/* Email indicator */}
          <div
            className="rounded-xl px-4 py-3 flex items-center gap-3 mb-7"
            style={{ backgroundColor: 'white', border: '1px solid #dce8fd' }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: '#f0f5fe' }}
            >
              <EnvelopeIcon className="w-4 h-4" style={{ color: '#2450a4' }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: '#6b98e8' }}>Código enviado a</p>
              <p className="mono text-sm font-semibold" style={{ color: '#0a1628' }}>{maskedEmail}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="mono text-xs" style={{ color: '#6b98e8' }}>Expira en</p>
              <p
                className="mono text-sm font-semibold"
                style={{ color: timer > 10 ? '#2450a4' : '#dc2626' }}
              >
                {formatTime(timer)}
              </p>
            </div>
          </div>

          {/* Digit boxes */}
          <div className="flex gap-3 justify-center mb-2" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                onFocus={e => e.target.select()}
                disabled={loading || verified}
                className="w-12 h-14 text-center mono text-xl font-semibold rounded-xl border-2 outline-none transition-all disabled:opacity-50"
                style={{
                  backgroundColor: d ? '#0a1628' : 'white',
                  borderColor: error ? '#dc2626' : d ? '#0a1628' : '#dce8fd',
                  color: d ? 'white' : '#0a1628',
                  caretColor: '#2450a4',
                }}
                autoFocus={i === 0}
              />
            ))}
          </div>

          {/* Demo hint */}
          <div className="flex justify-center mb-5">
            <span
              className="mono text-xs px-3 py-1.5 rounded-full"
              style={{ backgroundColor: 'rgba(36,80,164,0.08)', color: '#6b98e8' }}
            >
              Demo: código de prueba es{' '}
              <button
                type="button"
                className="font-semibold underline"
                style={{ color: '#2450a4' }}
                onClick={() => {
                  const d = OTP_DEMO.split('')
                  setDigits(d)
                  focusInput(OTP_LENGTH - 1)
                  submitCode(OTP_DEMO)
                }}
              >
                {OTP_DEMO}
              </button>
            </span>
          </div>

          {/* Error */}
          {error && (
            <div
              className="rounded-lg px-4 py-3 text-sm mb-4"
              style={{ backgroundColor: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.25)', color: '#b91c1c' }}
            >
              {error}
            </div>
          )}

          {/* Resent confirmation */}
          {resent && (
            <div
              className="rounded-lg px-4 py-3 text-sm mb-4 flex items-center gap-2"
              style={{ backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', color: '#065f46' }}
            >
              <CheckIcon className="w-4 h-4 flex-shrink-0" />
              Nuevo código enviado a {maskedEmail}
            </div>
          )}

          {/* Submit button */}
          <button
            type="button"
            onClick={handleManualSubmit}
            disabled={loading || digits.join('').length < OTP_LENGTH}
            className="w-full py-3.5 rounded-lg font-semibold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 mb-4"
            style={{ backgroundColor: '#0a1628', color: 'white' }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = '#162c5e' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#0a1628' }}
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="3" />
                  <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Verificando código...
              </>
            ) : (
              'Verificar código'
            )}
          </button>

          {/* Resend + Back */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              className="mono text-xs underline"
              style={{ color: '#6b98e8' }}
            >
              ← Volver
            </button>
            {timer <= 0 ? (
              <button
                type="button"
                onClick={handleResend}
                className="mono text-xs font-semibold underline"
                style={{ color: '#2450a4' }}
              >
                Reenviar código
              </button>
            ) : (
              <p className="mono text-xs" style={{ color: '#a8c4f4' }}>
                Reenviar en {formatTime(timer)}
              </p>
            )}
          </div>

          <p className="text-center mono text-xs mt-5" style={{ color: '#a8c4f4' }}>
            Este código expira en 10 minutos · Un solo uso
          </p>
        </>
      )}
    </AuthLayout>
  )
}
