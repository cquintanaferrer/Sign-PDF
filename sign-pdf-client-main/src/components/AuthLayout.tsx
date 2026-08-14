import { ShieldIcon, LockIcon } from './icons'

interface AuthLayoutProps {
  children: React.ReactNode
  step: number
  totalSteps: number
  heading: React.ReactNode
  subheading: string
}

export function AuthLayout({ children, step, totalSteps, heading, subheading }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* ── Left dark panel ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-5/12 p-12 relative overflow-hidden"
        style={{ backgroundColor: '#0a1628' }}
      >
        {/* Grid background */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'linear-gradient(rgba(100,160,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(100,160,255,0.4) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* Decorative rings */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-96 h-96 rounded-full border border-blue-500/20 pointer-events-none" />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-64 h-64 rounded-full border border-emerald-500/15 pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-14">
            <div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ backgroundColor: '#10b981' }}>
              <ShieldIcon className="w-5 h-5 text-white" />
            </div>
            <span className="mono text-sm font-semibold tracking-widest uppercase text-blue-200">
              CertSecure PKI
            </span>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className="transition-all duration-300"
                style={{
                  height: '3px',
                  width: i + 1 === step ? '32px' : '12px',
                  borderRadius: '2px',
                  backgroundColor: i + 1 <= step ? '#10b981' : 'rgba(100,160,255,0.2)',
                }}
              />
            ))}
            <span className="mono text-xs ml-2" style={{ color: '#3b6fd4' }}>
              {step} / {totalSteps}
            </span>
          </div>

          <div>
            <p className="mono text-xs tracking-widest uppercase mb-3" style={{ color: '#10b981' }}>
              Infraestructura de Clave Pública
            </p>
            <h1 className="text-4xl font-light leading-tight text-white mb-5">
              {heading}
            </h1>
            <p className="text-blue-200/60 text-sm leading-relaxed max-w-xs">{subheading}</p>
          </div>
        </div>

        {/* Bottom security card */}
        <div
          className="relative z-10 rounded-xl p-5 border"
          style={{ backgroundColor: 'rgba(16,185,129,0.07)', borderColor: 'rgba(16,185,129,0.2)' }}
        >
          <div className="flex items-start gap-3 mb-4">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgba(16,185,129,0.15)' }}
            >
              <LockIcon className="w-4 h-4" style={{ color: '#10b981' }} />
            </div>
            <div>
              <p className="text-white font-medium text-sm mb-0.5">Privacidad por diseño</p>
              <p className="text-emerald-300 text-xs leading-snug">
                "Tu llave privada se genera localmente y nunca toca nuestros servidores."
              </p>
            </div>
          </div>
          <div className="pt-4 border-t border-white/10 grid grid-cols-3 gap-2">
            {['FIPS 140-3', 'RFC 5280', 'NIST PQC'].map(label => (
              <div key={label} className="text-center">
                <div className="mono text-xs font-semibold text-emerald-400">{label}</div>
                <div className="text-blue-300/40 text-xs mt-0.5">Compliant</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right content panel ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12" style={{ backgroundColor: '#f0f5fe' }}>
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ backgroundColor: '#0a1628' }}>
              <ShieldIcon className="w-4 h-4" style={{ color: '#10b981' }} />
            </div>
            <span className="mono text-sm font-semibold tracking-wider uppercase" style={{ color: '#0a1628' }}>
              CertSecure PKI
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
