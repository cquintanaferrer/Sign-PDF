import { ShieldIcon } from './icons'

type AuthenticatedScreen = 'signDocument' | 'keys' | 'certificate' | 'validateCertificate' | 'validateStandaloneCertificate' | 'validateWebsite'

interface AppNavbarProps {
  userName: string
  currentScreen: string
  onNavigate: (screen: AuthenticatedScreen) => void
  onLogout: () => void
}

interface NavItem {
  id: AuthenticatedScreen
  label: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'signDocument', label: 'Firmar PDF' },
  { id: 'keys', label: 'Mis llaves' },
  { id: 'certificate', label: 'Certificados' },
  { id: 'validateCertificate', label: 'Validar PDF' },
  { id: 'validateStandaloneCertificate', label: 'Validar certificado' },
  { id: 'validateWebsite', label: 'Validar sitio' },
]

export function AppNavbar({ userName, currentScreen, onNavigate, onLogout }: AppNavbarProps) {
  return (
    <header className="w-full sticky top-0 z-50" style={{ backgroundColor: '#0a1628', borderBottom: '1px solid rgba(100,160,255,0.12)' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="h-16 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#10b981' }}>
              <ShieldIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="mono text-sm font-semibold tracking-wider text-white">CertSecure PKI</div>
              <div className="mono text-[10px]" style={{ color: '#6b98e8' }}>SECURE DOCUMENT SERVICES</div>
            </div>
          </div>

          <nav className="hidden xl:flex items-center gap-1">
            {NAV_ITEMS.map(item => {
              const active = currentScreen === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className="px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                  style={{ color: active ? '#ffffff' : '#8eace0', backgroundColor: active ? 'rgba(59,111,212,0.20)' : 'transparent' }}
                  onMouseEnter={e => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor = 'rgba(59,111,212,0.10)'
                      e.currentTarget.style.color = '#ffffff'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.color = '#8eace0'
                    }
                  }}
                >
                  {item.label}
                </button>
              )
            })}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden md:block text-right">
              <div className="text-xs font-medium text-white">{userName}</div>
              <div className="mono text-[10px]" style={{ color: '#6b98e8' }}>Usuario autenticado</div>
            </div>
            <button
              onClick={onLogout}
              className="mono text-xs px-3 py-2 rounded-lg transition-colors"
              style={{ color: '#8eace0', border: '1px solid rgba(100,160,255,0.18)' }}
              onMouseEnter={e => {
                e.currentTarget.style.color = '#ffffff'
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = '#8eace0'
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              Salir
            </button>
          </div>
        </div>

        <div className="xl:hidden flex gap-1 overflow-x-auto pb-3">
          {NAV_ITEMS.map(item => {
            const active = currentScreen === item.id
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="whitespace-nowrap px-3 py-1.5 rounded-lg text-xs"
                style={{ color: active ? '#ffffff' : '#8eace0', backgroundColor: active ? 'rgba(59,111,212,0.20)' : 'transparent' }}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      </div>
    </header>
  )
}
