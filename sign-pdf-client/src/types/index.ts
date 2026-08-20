export type Screen =
  | 'login'
  | 'register'
  | 'otp'
  | 'dashboard'
  | 'signDocument'
  | 'keys'
  | 'certificate'
  | 'validateCertificate'
  | 'validateWebsite'
  | 'algorithm'
  | 'processing'
  | 'keysReady'
  | 'success'

export type Algorithm =
  | 'ECDSA_P256'
  | 'ML_DSA_65'