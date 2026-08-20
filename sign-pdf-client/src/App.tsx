import { useState } from 'react'

import { LoginScreen } from './components/LoginScreen'
import { RegisterScreen } from './components/RegisterScreen'
import { OtpScreen } from './components/OtpScreen'
import { AlgorithmScreen } from './components/AlgorithmScreen'

import {
  ProcessingScreen,
  type GeneratedKeys,
} from './components/ProcessingScreen'

import { SuccessScreen } from './components/SuccessScreen'
import { SignDocumentScreen } from './components/SignDocumentScreen'
import { KeysReadyScreen } from './components/KeysReadyScreen'
import { AppNavbar } from './components/AppNavbar'
import { KeysPage } from './components/KeysPage'
import { CertificatePage } from './components/CertificatePage'
import { ValidateCertificatePage } from './components/ValidateCertificatePage'
import { ValidateWebsitePage } from './components/ValidateWebsitePage'

import type {
  Screen,
  Algorithm,
} from './types'


export default function App() {

  const [screen, setScreen] =
    useState<Screen>('login')

  const [userName, setUserName] =
    useState('')

  const [userEmail, setUserEmail] =
    useState('')

  const [algorithm, setAlgorithm] =
    useState<Algorithm>('ECDSA_P256')

  const [token, setToken] =
    useState('')

  const [keys, setKeys] =
    useState<GeneratedKeys | null>(null)


  // =========================================================
  // LOGOUT
  // =========================================================

  const reset = () => {

    setUserName('')
    setUserEmail('')
    setAlgorithm('ECDSA_P256')
    setToken('')
    setKeys(null)

    setScreen('login')
  }


  // =========================================================
  // NAVEGACIÓN AUTENTICADA
  // =========================================================

  const navigateAuthenticated = (
    nextScreen:
      | 'signDocument'
      | 'keys'
      | 'certificate'
      | 'validateCertificate'
      | 'validateWebsite',
  ) => {

    setScreen(nextScreen)
  }


  return (
    <>

      {/* =====================================================
          LOGIN
          ===================================================== */}

      {screen === 'login' && (

        <LoginScreen

          onLogin={(email, t) => {

            setUserEmail(email)
            setToken(t)

            setScreen('otp')
          }}

          onGoRegister={() =>
            setScreen('register')
          }

        />

      )}


      {/* =====================================================
          REGISTER
          ===================================================== */}

      {screen === 'register' && (

        <RegisterScreen

          onRegister={(name, email, t) => {

            setUserName(name)
            setUserEmail(email)
            setToken(t)

            setScreen('otp')
          }}

          onGoLogin={() =>
            setScreen('login')
          }

        />

      )}


      {/* =====================================================
          OTP
          ===================================================== */}

      {screen === 'otp' && (

        <OtpScreen

          email={userEmail}

          onVerified={() => {

            setScreen('signDocument')
          }}

          onBack={() => {

            setScreen('login')
          }}

        />

      )}


      {/* =====================================================
          ALGORITHM
          ===================================================== */}

      {screen === 'algorithm' && (

        <AlgorithmScreen

          userName={
            userName || userEmail
          }

          onSelect={(algo) => {

            setAlgorithm(algo)
            setScreen('processing')
          }}

        />

      )}


      {/* =====================================================
          GENERACIÓN DE LLAVES
          ===================================================== */}

      {screen === 'processing' && (

        <ProcessingScreen

          algorithm={algorithm}

          token={token}

          userName={userName}

          userEmail={userEmail}

          onComplete={(generatedKeys) => {

            setKeys(generatedKeys)
            setScreen('keysReady')
          }}

        />

      )}


      {/* =====================================================
          LLAVES GENERADAS
          ===================================================== */}

      {screen === 'keysReady' && keys && (

        <KeysReadyScreen

          algorithm={algorithm}

          userName={
            userName || userEmail
          }

          userEmail={userEmail}

          privateKeyPem={
            keys.privateKeyPem
          }

          publicKeyPem={
            keys.publicKeyPem
          }

          certId={keys.certId}

          token={token}

          onReset={reset}

        />

      )}


      {/* =====================================================
          SUCCESS
          ===================================================== */}

      {screen === 'success' && (

        <SuccessScreen

          algorithm={algorithm}

          userName={
            userName || userEmail
          }

          userEmail={userEmail}

          onReset={() => {

            setAlgorithm('ECDSA_P256')
            setScreen('signDocument')
          }}

        />

      )}


      {/* =====================================================
          FIRMAR PDF
          ===================================================== */}

      {screen === 'signDocument' && (

        <>

          <AppNavbar

            userName={
              userName || userEmail
            }

            currentScreen={screen}

            onNavigate={
              navigateAuthenticated
            }

            onLogout={reset}

          />

          <SignDocumentScreen

            algorithm={algorithm}

            userName={
              userName || userEmail
            }

            userEmail={userEmail}

            token={token}

            onBack={() => {

              setScreen('signDocument')
            }}

          />

        </>

      )}


      {/* =====================================================
          MIS LLAVES
          ===================================================== */}

      {screen === 'keys' && (

        <>

          <AppNavbar

            userName={
              userName || userEmail
            }

            currentScreen={screen}

            onNavigate={
              navigateAuthenticated
            }

            onLogout={reset}

          />

          <KeysPage />

        </>

      )}


      {/* =====================================================
          SOLICITAR CERTIFICADO
          ===================================================== */}

      {screen === 'certificate' && (

        <>

          <AppNavbar

            userName={
              userName || userEmail
            }

            currentScreen={screen}

            onNavigate={
              navigateAuthenticated
            }

            onLogout={reset}

          />

          <CertificatePage

            token={token}

          />

        </>

      )}


      {/* =====================================================
          VALIDAR CERTIFICADO
          ===================================================== */}

      {screen === 'validateCertificate' && (

        <>

          <AppNavbar

            userName={
              userName || userEmail
            }

            currentScreen={screen}

            onNavigate={
              navigateAuthenticated
            }

            onLogout={reset}

          />

          <ValidateCertificatePage

            token={token}

            onBack={() =>
              setScreen('signDocument')
            }

          />

        </>

      )}


      {/* =====================================================
          VALIDAR SITIO WEB
          ===================================================== */}

      {screen === 'validateWebsite' && (

        <>

          <AppNavbar

            userName={
              userName || userEmail
            }

            currentScreen={screen}

            onNavigate={
              navigateAuthenticated
            }

            onLogout={reset}

          />

          <ValidateWebsitePage />

        </>

      )}

    </>
  )
}