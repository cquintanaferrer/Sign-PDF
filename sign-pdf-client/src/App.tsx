import { useState } from 'react'
import { LoginScreen } from './components/LoginScreen'
import { RegisterScreen } from './components/RegisterScreen'
import { OtpScreen } from './components/OtpScreen'
import { SignDocumentScreen } from './components/SignDocumentScreen'
import { AppNavbar } from './components/AppNavbar'
import { KeysPage } from './components/KeysPage'
import { CertificatePage } from './components/CertificatePage'
import { ValidateCertificatePage } from './components/ValidateCertificatePage'
import { ValidateStandaloneCertificatePage } from './components/ValidateStandaloneCertificatePage'
import { ValidateWebsitePage } from './components/ValidateWebsitePage'
import { getProfile } from './services/api'
import type { Screen } from './types'

type AuthenticatedScreen = 'signDocument' | 'keys' | 'certificate' | 'validateCertificate' | 'validateStandaloneCertificate' | 'validateWebsite'

export default function App() {
  const [screen, setScreen] = useState<Screen>('login')
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [token, setToken] = useState('')

  const reset = () => {
    setUserName('')
    setUserEmail('')
    setToken('')
    setScreen('login')
  }

  const navigateAuthenticated = (nextScreen: AuthenticatedScreen) => setScreen(nextScreen)

  const navbar = (currentScreen: string) => (
    <AppNavbar
      userName={userName || userEmail}
      currentScreen={currentScreen}
      onNavigate={navigateAuthenticated}
      onLogout={reset}
    />
  )

  if (screen === 'login') {
    return (
      <LoginScreen
        onLogin={async (email, accessToken) => {
          setUserEmail(email)
          setToken(accessToken)
          try {
            const profile = await getProfile(accessToken)
            setUserName(profile.name)
            setUserEmail(profile.email)
          } catch {
            setUserName(email)
          }
          setScreen('otp')
        }}
        onGoRegister={() => setScreen('register')}
      />
    )
  }

  if (screen === 'register') {
    return (
      <RegisterScreen
        onRegister={(name, email, accessToken) => {
          setUserName(name)
          setUserEmail(email)
          setToken(accessToken)
          setScreen('otp')
        }}
        onGoLogin={() => setScreen('login')}
      />
    )
  }

  if (screen === 'otp') {
    return (
      <OtpScreen
        email={userEmail}
        onVerified={() => setScreen('signDocument')}
        onBack={() => setScreen('login')}
      />
    )
  }

  if (screen === 'keys') {
    return <>{navbar(screen)}<KeysPage userEmail={userEmail} /></>
  }

  if (screen === 'certificate') {
    return (
      <>
        {navbar(screen)}
        <CertificatePage userName={userName || userEmail} userEmail={userEmail} token={token} />
      </>
    )
  }

  if (screen === 'validateCertificate') {
    return (
      <>
        {navbar(screen)}
        <ValidateCertificatePage token={token} onBack={() => setScreen('signDocument')} />
      </>
    )
  }

  if (screen === 'validateStandaloneCertificate') {
    return (
      <>
        {navbar(screen)}
        <ValidateStandaloneCertificatePage onBack={() => setScreen('signDocument')} />
      </>
    )
  }

  if (screen === 'validateWebsite') {
    return (
      <>
        {navbar(screen)}
        <ValidateWebsitePage token={token} onBack={() => setScreen('signDocument')} />
      </>
    )
  }

  return (
    <>
      {navbar('signDocument')}
      <SignDocumentScreen
        userName={userName || userEmail}
        userEmail={userEmail}
        token={token}
        onBack={() => setScreen('signDocument')}
      />
    </>
  )
}
