import { useState } from 'react'
import { AuthLayout } from './AuthLayout'
import { ShieldIcon, LockIcon, ChipIcon } from './icons'

type Algorithm = 'ECDSA_P256' | 'ML_DSA_65'

interface AlgorithmScreenProps {
  userName: string
  onSelect: (algo: Algorithm) => void
}

interface AlgoCardProps {
  id: Algorithm
  selected: boolean
  onSelect: () => void
  badge: string
  badgeColor: string
  badgeBg: string
  title: string
  subtitle: string
  specs: { label: string; value: string }[]
  desc: string
  pros: string[]
  icon: React.ReactNode
}

function AlgoCard({ selected, onSelect, badge, badgeColor, badgeBg, title, subtitle, specs, desc, pros, icon }: AlgoCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left rounded-xl p-5 border-2 transition-all duration-200"
      style={{
        backgroundColor: 'white',
        borderColor: selected ? '#0a1628' : '#dce8fd',
        boxShadow: selected ? '0 0 0 1px #0a1628, 0 4px 16px rgba(10,22,40,0.08)' : 'none',
      }}
    >
      <div className="flex items-start gap-4">
        {/* Radio */}
        <div
          className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
          style={{
            borderColor: selected ? '#0a1628' : '#a8c4f4',
            backgroundColor: selected ? '#0a1628' : 'transparent',
          }}
        >
          {selected && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className="font-semibold" style={{ color: '#0a1628' }}>{title}</span>
                <span
                  className="mono text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ color: badgeColor, backgroundColor: badgeBg }}
                >
                  {badge}
                </span>
              </div>
              <p className="text-xs" style={{ color: '#6b98e8' }}>{subtitle}</p>
            </div>
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: badgeBg }}
            >
              {icon}
            </div>
          </div>

          {/* Specs */}
          <div className="flex flex-wrap gap-2 mb-3">
            {specs.map(s => (
              <div key={s.label} className="rounded px-2 py-1" style={{ backgroundColor: '#f0f5fe' }}>
                <p className="mono text-xs" style={{ color: '#6b98e8' }}>{s.label}</p>
                <p className="mono text-xs font-semibold" style={{ color: '#0a1628' }}>{s.value}</p>
              </div>
            ))}
          </div>

          <p className="text-xs leading-relaxed mb-3" style={{ color: '#3b6fd4' }}>{desc}</p>

          {/* Pros */}
          <div className="flex flex-wrap gap-1.5">
            {pros.map(p => (
              <span
                key={p}
                className="mono text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: selected ? 'rgba(16,185,129,0.1)' : '#f0f5fe', color: selected ? '#059669' : '#6b98e8' }}
              >
                ✓ {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </button>
  )
}

export function AlgorithmScreen({ userName, onSelect }: AlgorithmScreenProps) {
  const [algorithm, setAlgorithm] = useState<Algorithm>('ECDSA_P256')
  const firstName = userName.split(' ')[0]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSelect(algorithm)
  }

  return (
    <AuthLayout
      step={3}
      totalSteps={4}
      heading={<>Elige tu <span className="font-semibold">algoritmo criptográfico</span></>}
      subheading="El algoritmo determina cómo se firmará tu certificado. Esta elección es permanente para el ciclo de vida del certificado."
    >
      <div className="mb-7">
        <h2 className="text-2xl font-semibold mb-1" style={{ color: '#0a1628' }}>
          Selección de algoritmo
        </h2>
        <p className="text-sm" style={{ color: '#3b6fd4' }}>
          Bienvenido, <strong>{firstName}</strong>. Elige el tipo de firma para tu certificado.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <AlgoCard
          id="ECDSA_P256"
          selected={algorithm === 'ECDSA_P256'}
          onSelect={() => setAlgorithm('ECDSA_P256')}
          badge="Estándar de la industria"
          badgeColor="#2450a4"
          badgeBg="rgba(36,80,164,0.08)"
          title="ECDSA P-256"
          subtitle="Elliptic Curve Digital Signature Algorithm · NIST P-256"
          specs={[
            { label: 'Clave', value: '256 bits' },
            { label: 'Firma', value: '64 bytes' },
            { label: 'Seguridad', value: '128 bits' },
            { label: 'Estándar', value: 'FIPS 186-4' },
          ]}
          desc="Ampliamente soportado en todos los sistemas TLS, navegadores y dispositivos modernos. Seguridad demostrada con más de una década de despliegue en producción a escala mundial."
          pros={['Compatibilidad universal', 'Rendimiento óptimo', 'Soporte TLS 1.3', 'Ecosistema maduro']}
          icon={<ShieldIcon className="w-5 h-5" style={{ color: '#2450a4' }} />}
        />

        <AlgoCard
          id="ML_DSA_65"
          selected={algorithm === 'ML_DSA_65'}
          onSelect={() => setAlgorithm('ML_DSA_65')}
          badge="Post-Quantum · NIST FIPS 204"
          badgeColor="#059669"
          badgeBg="rgba(5,150,105,0.08)"
          title="ML-DSA-65"
          subtitle="Module-Lattice-Based Digital Signature Algorithm · Nivel 3"
          specs={[
            { label: 'Clave pública', value: '1.952 KB' },
            { label: 'Firma', value: '3.309 KB' },
            { label: 'Seguridad', value: 'Nivel NIST 3' },
            { label: 'Estándar', value: 'FIPS 204' },
          ]}
          desc="Estandarizado por NIST en agosto 2024 como parte del proceso de estandarización post-cuántica. Basado en retículos modulares (Module-LWE), resistente a ataques de computadoras cuánticas."
          pros={['Resistente a computación cuántica', 'NIST FIPS 204', 'Preparado para el futuro', 'Seguridad lattice-based']}
          icon={<ChipIcon className="w-5 h-5" style={{ color: '#059669' }} />}
        />

        {/* Comparison note */}
        <div
          className="rounded-xl p-4 flex items-start gap-3"
          style={{ backgroundColor: 'rgba(36,80,164,0.06)', border: '1px solid rgba(36,80,164,0.15)' }}
        >
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="#3b6fd4" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          <p className="text-xs leading-relaxed" style={{ color: '#3b6fd4' }}>
            <strong>¿Cuál elegir?</strong> Si necesitas máxima compatibilidad hoy, elige ECDSA P-256. Si tu infraestructura estará activa más de 5-10 años o manejas datos sensibles a largo plazo, considera ML-DSA-65.
          </p>
        </div>

        <button
          type="submit"
          className="w-full py-3.5 rounded-lg font-semibold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2"
          style={{ backgroundColor: '#0a1628', color: 'white' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#162c5e')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#0a1628')}
        >
          <LockIcon className="w-4 h-4" />
          Generar Llaves y Solicitar Certificado
          <span
            className="ml-auto mono text-xs px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
          >
            {algorithm === 'ECDSA_P256' ? 'ECDSA P-256' : 'ML-DSA-65'}
          </span>
        </button>
      </form>
    </AuthLayout>
  )
}
