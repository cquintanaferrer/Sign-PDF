export type Screen =
  | 'login'
  | 'register'
  | 'otp'
  | 'signDocument'
  | 'keys'
  | 'certificate'
  | 'validateCertificate'
  | 'validateStandaloneCertificate'
  | 'validateWebsite'

export type Algorithm = 'ECDSA_P256' | 'ML_DSA_65'
