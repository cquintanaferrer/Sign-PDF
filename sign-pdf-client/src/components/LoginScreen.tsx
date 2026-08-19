import { useState } from 'react'
import { AuthLayout } from './AuthLayout'
import { LockIcon, EnvelopeIcon, EyeIcon, EyeSlashIcon, ArrowRightIcon } from './icons'
import { login, ApiError } from '../services/api'

interface LoginScreenProps {
  onLogin: (email: string, token: string) => void
  onGoRegister: () => void
}

export function LoginScreen({ onLogin, onGoRegister }: LoginScreenProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Por favor completa todos los campos.')
      return
    }
    setLoading(true)
    
    try {
      const data = await login(email, password)
      onLogin(email, data.access_token)
    } catch (err) {
      console.error(err);
      setError(err instanceof ApiError ? err.message : 'Error de conexión: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      step={1}
      totalSteps={4}
      heading={<>Accede a tu <span className="font-semibold">cuenta segura</span></>}
      subheading="Autentícate para gestionar y emitir certificados de identidad digital con máxima seguridad."
    >
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-1" style={{ color: '#0a1628' }}>
          Iniciar sesión
        </h2>
        <p className="text-sm" style={{ color: '#3b6fd4' }}>
          ¿No tienes cuenta?{' '}
          <button
            type="button"
            onClick={onGoRegister}
            className="font-semibold underline underline-offset-2 transition-colors"
            style={{ color: '#0a1628' }}
          >
            Regístrate aquí
          </button>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email */}
        <div>
          <label className="block text-xs font-semibold tracking-wide uppercase mb-1.5" style={{ color: '#162c5e' }}>
            Correo electrónico
          </label>
          <div className="relative">
            <EnvelopeIcon
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: '#6b98e8' }}
            />
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@empresa.com"
              className="w-full pl-10 pr-4 py-3 rounded-lg text-sm border outline-none transition-all"
              style={{ backgroundColor: 'white', borderColor: '#a8c4f4', color: '#0a1628' }}
              onFocus={e => (e.target.style.borderColor = '#2450a4')}
              onBlur={e => (e.target.style.borderColor = '#a8c4f4')}
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold tracking-wide uppercase" style={{ color: '#162c5e' }}>
              Contraseña
            </label>
            <button
              type="button"
              className="mono text-xs underline"
              style={{ color: '#3b6fd4' }}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
          <div className="relative">
            <LockIcon
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: '#6b98e8' }}
            />
            <input
              type={showPwd ? 'text' : 'password'}
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Tu contraseña"
              className="w-full pl-10 pr-11 py-3 rounded-lg text-sm border outline-none transition-all"
              style={{ backgroundColor: 'white', borderColor: '#a8c4f4', color: '#0a1628' }}
              onFocus={e => (e.target.style.borderColor = '#2450a4')}
              onBlur={e => (e.target.style.borderColor = '#a8c4f4')}
            />
            <button
              type="button"
              onClick={() => setShowPwd(v => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5"
              style={{ color: '#6b98e8' }}
            >
              {showPwd ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            className="rounded-lg px-4 py-3 text-sm"
            style={{ backgroundColor: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.25)', color: '#b91c1c' }}
          >
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-lg font-semibold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
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
              Verificando credenciales...
            </>
          ) : (
            <>
              <LockIcon className="w-4 h-4" />
              Iniciar sesión
              <ArrowRightIcon className="w-4 h-4 ml-auto" />
            </>
          )}
        </button>

        {/* OTP notice */}
        <div
          className="rounded-lg px-4 py-3 flex items-start gap-3"
          style={{ backgroundColor: 'rgba(36,80,164,0.07)', border: '1px solid rgba(36,80,164,0.15)' }}
        >
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="#3b6fd4" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 8.25h3m-3 3h3m-3 3h3" />
          </svg>
          <p className="text-xs leading-relaxed" style={{ color: '#3b6fd4' }}>
            Después del login recibirás un código OTP de un solo uso en tu correo para completar la verificación en dos pasos.
          </p>
        </div>

        <p className="text-center mono text-xs pt-1" style={{ color: '#a8c4f4' }}>
          Conexión cifrada · TLS 1.3 · HSTS activado
        </p>
      </form>
    </AuthLayout>
  )
}
