import { derToPem, pemToDer } from "../encoding.ts";
import { derBitString, derContext0Empty, derIa5String, derIntegerNumber, derOid, derSequence, derSet, derUtf8String } from "./der.ts";
import { rawP256SignatureToDer } from "./ecdsaSignature.ts";

const OID_COMMON_NAME = "2.5.4.3";
const OID_EMAIL_ADDRESS = "1.2.840.113549.1.9.1";
const OID_ECDSA_WITH_SHA256 = "1.2.840.10045.4.3.2";

export interface CsrSubject {
  commonName: string;
  email: string;
}

function attributeTypeAndValue(oid: string, value: Uint8Array): Uint8Array {
  return derSequence(derOid(oid), value);
}

function buildSubject(subject: CsrSubject): Uint8Array {
  const commonName = subject.commonName.trim();
  const email = subject.email.trim();
  if (!commonName) throw new Error("CSR commonName is required.");
  if (!email || !email.includes("@")) throw new Error("A valid CSR email is required.");
  return derSequence(
    derSet(attributeTypeAndValue(OID_COMMON_NAME, derUtf8String(commonName))),
    derSet(attributeTypeAndValue(OID_EMAIL_ADDRESS, derIa5String(email))),
  );
}

export async function createEcdsaP256Csr(privateKey: CryptoKey, publicKey: CryptoKey, subject: CsrSubject): Promise<string> {
  if (privateKey.type !== "private" || publicKey.type !== "public") throw new Error("CSR creation requires a private/public key pair.");
  const spki = new Uint8Array(await crypto.subtle.exportKey("spki", publicKey));
  // Reuse the browser-generated SubjectPublicKeyInfo DER instead of re-encoding it.
  const certificationRequestInfo = derSequence(
    derIntegerNumber(0),
    buildSubject(subject),
    spki,
    derContext0Empty(),
  );

  const rawSignature = new Uint8Array(await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    certificationRequestInfo,
  ));
  const signatureDer = rawP256SignatureToDer(rawSignature);
  const signatureAlgorithm = derSequence(derOid(OID_ECDSA_WITH_SHA256));
  const csrDer = derSequence(certificationRequestInfo, signatureAlgorithm, derBitString(signatureDer));
  return derToPem(csrDer, "CERTIFICATE REQUEST");
}

export function csrPemToDer(csrPem: string): Uint8Array {
  return pemToDer(csrPem, "CERTIFICATE REQUEST");
}
