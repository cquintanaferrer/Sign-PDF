import { useState } from 'react'
import { AuthLayout } from './AuthLayout'
import { LockIcon, EnvelopeIcon, UserIcon, EyeIcon, EyeSlashIcon, ArrowRightIcon } from './icons'
import { register, login, ApiError } from '../services/api'

interface RegisterScreenProps {
  onRegister: (name: string, email: string, token: string) => void
  onGoLogin: () => void
}

function StrengthBar({ password }: { password: string }) {
  const checks = [
    password.length >= 12,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ]
  const score = checks.filter(Boolean).length
  const labels = ['', 'Débil', 'Regular', 'Buena', 'Fuerte']
  const colors = ['', '#dc2626', '#f59e0b', '#2450a4', '#10b981']

  if (!password) return null

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ backgroundColor: i <= score ? colors[score] : '#dce8fd' }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <p className="mono text-xs" style={{ color: colors[score] }}>
          {labels[score]}
        </p>
        <div className="flex gap-2">
          {[
            { ok: checks[0], label: '12+ chars' },
            { ok: checks[1], label: 'Mayúscula' },
            { ok: checks[2], label: 'Número' },
            { ok: checks[3], label: 'Símbolo' },
          ].map(c => (
            <span
              key={c.label}
              className="mono text-xs px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: c.ok ? 'rgba(16,185,129,0.1)' : '#f0f5fe',
                color: c.ok ? '#059669' : '#a8c4f4',
              }}
            >
              {c.ok ? '✓' : '·'} {c.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export function RegisterScreen({ onRegister, onGoLogin }: RegisterScreenProps) {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    setLoading(true)
    
    try {
      const data = await register(form.name, form.email, form.password)
      const loginData = await login(form.email, form.password)
      onRegister(data.name, data.email, loginData.access_token)
    } catch (err) {
      console.error(err);
      setError(err instanceof ApiError ? err.message : 'Error de conexión: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setLoading(false)
    }
  }

  const inputBase: React.CSSProperties = {
    backgroundColor: 'white',
    borderColor: '#a8c4f4',
    color: '#0a1628',
  }

  return (
    <AuthLayout
      step={1}
      totalSteps={4}
      heading={<>Crea tu <span className="font-semibold">identidad digital</span></>}
      subheading="Regístrate para obtener un certificado criptográfico vinculado a tu identidad verificada."
    >
      <div className="mb-7">
        <h2 className="text-2xl font-semibold mb-1" style={{ color: '#0a1628' }}>
          Crear cuenta
        </h2>
        <p className="text-sm" style={{ color: '#3b6fd4' }}>
          ¿Ya tienes cuenta?{' '}
          <button
            type="button"
            onClick={onGoLogin}
            className="font-semibold underline underline-offset-2"
            style={{ color: '#0a1628' }}
          >
            Inicia sesión
          </button>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full name */}
        <div>
          <label className="block text-xs font-semibold tracking-wide uppercase mb-1.5" style={{ color: '#162c5e' }}>
            Nombre completo
          </label>
          <div className="relative">
            <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#6b98e8' }} />
            <input
              type="text"
              required
              value={form.name}
              onChange={set('name')}
              placeholder="Ana García Martínez"
              className="w-full pl-10 pr-4 py-3 rounded-lg text-sm border outline-none transition-all"
              style={inputBase}
              onFocus={e => (e.target.style.borderColor = '#2450a4')}
              onBlur={e => (e.target.style.borderColor = '#a8c4f4')}
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-semibold tracking-wide uppercase mb-1.5" style={{ color: '#162c5e' }}>
            Correo electrónico
          </label>
          <div className="relative">
            <EnvelopeIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#6b98e8' }} />
            <input
              type="email"
              required
              value={form.email}
              onChange={set('email')}
              placeholder="ana@empresa.com"
              className="w-full pl-10 pr-4 py-3 rounded-lg text-sm border outline-none transition-all"
              style={inputBase}
              onFocus={e => (e.target.style.borderColor = '#2450a4')}
              onBlur={e => (e.target.style.borderColor = '#a8c4f4')}
            />
          </div>
          <p className="mono text-xs mt-1" style={{ color: '#a8c4f4' }}>
            Se enviará un código OTP de verificación a este correo
          </p>
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-semibold tracking-wide uppercase mb-1.5" style={{ color: '#162c5e' }}>
            Contraseña
          </label>
          <div className="relative">
            <LockIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#6b98e8' }} />
            <input
              type={showPwd ? 'text' : 'password'}
              required
              value={form.password}
              onChange={set('password')}
              placeholder="Mínimo 12 caracteres"
              className="w-full pl-10 pr-11 py-3 rounded-lg text-sm border outline-none transition-all"
              style={inputBase}
              onFocus={e => (e.target.style.borderColor = '#2450a4')}
              onBlur={e => (e.target.style.borderColor = '#a8c4f4')}
            />
            <button
              type="button"
              onClick={() => setShowPwd(v => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2"
              style={{ color: '#6b98e8' }}
            >
              {showPwd ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
            </button>
          </div>
          <StrengthBar password={form.password} />
        </div>

        {/* Confirm */}
        <div>
          <label className="block text-xs font-semibold tracking-wide uppercase mb-1.5" style={{ color: '#162c5e' }}>
            Confirmar contraseña
          </label>
          <div className="relative">
            <LockIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#6b98e8' }} />
            <input
              type={showConfirm ? 'text' : 'password'}
              required
              value={form.confirm}
              onChange={set('confirm')}
              placeholder="Repite la contraseña"
              className="w-full pl-10 pr-11 py-3 rounded-lg text-sm border outline-none transition-all"
              style={{
                ...inputBase,
                borderColor: form.confirm && form.confirm !== form.password ? '#dc2626' : '#a8c4f4',
              }}
              onFocus={e => (e.target.style.borderColor = '#2450a4')}
              onBlur={e => {
                e.target.style.borderColor =
                  form.confirm && form.confirm !== form.password ? '#dc2626' : '#a8c4f4'
              }}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(v => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2"
              style={{ color: '#6b98e8' }}
            >
              {showConfirm ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
            </button>
          </div>
          {form.confirm && form.confirm !== form.password && (
            <p className="mono text-xs mt-1" style={{ color: '#dc2626' }}>
              Las contraseñas no coinciden
            </p>
          )}
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

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-lg font-semibold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60"
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
              Creando cuenta...
            </>
          ) : (
            <>
              Crear cuenta y verificar identidad
              <ArrowRightIcon className="w-4 h-4 ml-auto" />
            </>
          )}
        </button>

        <p className="text-center text-xs" style={{ color: '#6b98e8' }}>
          Al registrarte aceptas los{' '}
          <span className="underline cursor-pointer" style={{ color: '#2450a4' }}>Términos de Servicio</span>
          {' '}y la{' '}
          <span className="underline cursor-pointer" style={{ color: '#2450a4' }}>Política de Privacidad</span>
        </p>
      </form>
    </AuthLayout>
  )
}
