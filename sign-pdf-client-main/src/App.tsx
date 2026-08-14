import { useState } from 'react'
import { LoginScreen } from './components/LoginScreen'
import { RegisterScreen } from './components/RegisterScreen'
import { OtpScreen } from './components/OtpScreen'
import { AlgorithmScreen } from './components/AlgorithmScreen'
import { ProcessingScreen } from './components/ProcessingScreen'
import { SuccessScreen } from './components/SuccessScreen'
import { DashboardScreen } from './components/DashboardScreen'
import type { Screen, Algorithm } from './types'


export default function App() {
  const [screen, setScreen] = useState<Screen>('login')
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [algorithm, setAlgorithm] = useState<Algorithm>('ECDSA_P256')

  const [token, setToken] = useState('')

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
          onVerified={() => setScreen('algorithm')}
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
          onComplete={() => setScreen('dashboard')}
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
          token={token}
          onNewRequest={() => {
            setAlgorithm('ECDSA_P256')
            setScreen('algorithm')
          }}
        />
      )}
    </>
  )
}
