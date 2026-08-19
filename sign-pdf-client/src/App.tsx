import { useState } from 'react'
import { LoginScreen } from './components/LoginScreen'
import { RegisterScreen } from './components/RegisterScreen'
import { OtpScreen } from './components/OtpScreen'
import { AlgorithmScreen } from './components/AlgorithmScreen'
import { ProcessingScreen, type GeneratedKeys } from './components/ProcessingScreen'
import { SuccessScreen } from './components/SuccessScreen'
import { DashboardScreen, type CertSummary } from './components/DashboardScreen'
import { SignDocumentScreen } from './components/SignDocumentScreen'
import type { Screen, Algorithm } from './types'
import { KeysReadyScreen } from './components/KeysReadyScreen'


export default function App() {
  const [screen, setScreen] = useState<Screen>('login')
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [algorithm, setAlgorithm] = useState<Algorithm>('ECDSA_P256')

  const [token, setToken] = useState('')
  const [keys, setKeys] = useState<GeneratedKeys | null>(null)
  const [cert, setCert] = useState<CertSummary | null>(null)

  const reset = () => {
    setUserName('')
    setUserEmail('')
    setAlgorithm('ECDSA_P256')
    setScreen('login')
  }

  return (
    <>
      {screen === 'login' && (
        <LoginScreen
          onLogin={(email, t) => {
            setUserEmail(email)
            setToken(t)
            setScreen('otp')
          }}
          onGoRegister={() => setScreen('register')}
        />
      )}

      {screen === 'register' && (
        <RegisterScreen
          onRegister={(name, email, t) => {
            setUserName(name)
            setUserEmail(email)
            setToken(t)
            setScreen('otp')
          }}
          onGoLogin={() => setScreen('login')}
        />
      )}

      {screen === 'otp' && (
        <OtpScreen
          email={userEmail}
          onVerified={() => setScreen('dashboard')}
          onBack={() => setScreen('login')}
        />
      )}

      {screen === 'algorithm' && (
        <AlgorithmScreen
          userName={userName || userEmail}
          onSelect={algo => {
            setAlgorithm(algo)
            setScreen('processing')
          }}
        />
      )}

      {screen === 'processing' && (
        <ProcessingScreen
          algorithm={algorithm}
          token={token}
          userName={userName}
          userEmail={userEmail}
          onComplete={generatedKeys => {
            setKeys(generatedKeys)
            setScreen('keysReady')
          }}
        />
      )}

      {screen === 'keysReady' && keys && (
        <KeysReadyScreen
          algorithm={algorithm}
          userName={userName || userEmail}
          userEmail={userEmail}
          privateKeyPem={keys.privateKeyPem}
          publicKeyPem={keys.publicKeyPem}
          certId={keys.certId}
          token={token}
          onReset={ reset }
         />
      )}

      {screen === 'success' && (
        <SuccessScreen
          algorithm={algorithm}
          userName={userName || userEmail}
          userEmail={userEmail}
          onReset={() => {
            setAlgorithm('ECDSA_P256')
            setScreen('dashboard')
          }}
        />
      )}

      {screen === 'dashboard' && (
        <DashboardScreen
          userName={userName || userEmail}
          userEmail={userEmail}
          cert={cert}
          onRequestCert={() => {
            setAlgorithm('ECDSA_P256')
            setScreen('algorithm')
          }}
          onSignDocuments={() => setScreen('signDocument')}
          onActivateDemoCert={() => {
            setCert({
              algorithm,
              serial: `DEMO-${Date.now().toString(36).toUpperCase()}`,
              issuedAt: new Date().toLocaleDateString('es-ES'),
              expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES'),
              status: 'active',
            })
          }}
          onLogout={reset}
        />
      )}

      {screen === 'signDocument' && cert && (
        <SignDocumentScreen
          algorithm={algorithm}
          userName={userName || userEmail}
          userEmail={userEmail}
          certSerial={cert.serial}
          onBack={() => setScreen('dashboard')}
        />
      )}
    </>
  )
}
