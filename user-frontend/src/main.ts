import "./style.css";
import { EcdsaProvider, createEcdsaP256Csr, bytesToBase64 } from "./crypto/index.ts";

const provider = new EcdsaProvider();

let keyPair: CryptoKeyPair | null = null;
let privatePem = "";
let publicPem = "";
let csrPem = "";
let fileBytes: Uint8Array | null = null;
let signature: Uint8Array | null = null;

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
}

const generateKeysButton = byId<HTMLButtonElement>("generateKeys");
const createCsrButton = byId<HTMLButtonElement>("createCsr");
const sendCsrMockButton = byId<HTMLButtonElement>("sendCsrMock");
const downloadCsrButton = byId<HTMLButtonElement>("downloadCsr");
const downloadPrivateButton = byId<HTMLButtonElement>("downloadPrivate");
const downloadPublicButton = byId<HTMLButtonElement>("downloadPublic");
const signDocumentButton = byId<HTMLButtonElement>("signDocument");
const verifyDocumentButton = byId<HTMLButtonElement>("verifyDocument");
const verifyTamperedButton = byId<HTMLButtonElement>("verifyTampered");

const privateKeyPemArea = byId<HTMLTextAreaElement>("privateKeyPem");
const publicKeyPemArea = byId<HTMLTextAreaElement>("publicKeyPem");
const csrPemArea = byId<HTMLTextAreaElement>("csrPem");
const signatureArea = byId<HTMLTextAreaElement>("signatureBase64");
const commonNameInput = byId<HTMLInputElement>("commonName");
const emailInput = byId<HTMLInputElement>("email");
const documentInput = byId<HTMLInputElement>("documentFile");
const keyStatus = byId<HTMLSpanElement>("keyStatus");
const mockResponse = byId<HTMLPreElement>("mockResponse");
const verificationResult = byId<HTMLDivElement>("verificationResult");
const activityLog = byId<HTMLPreElement>("activityLog");

function log(message: string): void {
  const time = new Date().toLocaleTimeString();
  activityLog.textContent += `\n[${time}] ${message}`;
  activityLog.scrollTop = activityLog.scrollHeight;
}

function setVerification(text: string, kind: "neutral" | "success" | "error"): void {
  verificationResult.textContent = text;
  verificationResult.className = `verification ${kind}`;
}

function setStatus(element: HTMLElement, text: string, kind: "neutral" | "success" | "error"): void {
  element.textContent = text;
  element.className = `status ${kind}`;
}

function updateControls(): void {
  const hasKeys = keyPair !== null && privatePem.length > 0 && publicPem.length > 0;
  const hasFile = fileBytes !== null;
  const hasSignature = signature !== null;

  createCsrButton.disabled = !hasKeys;
  downloadPrivateButton.disabled = !hasKeys;
  downloadPublicButton.disabled = !hasKeys;
  sendCsrMockButton.disabled = csrPem.length === 0;
  downloadCsrButton.disabled = csrPem.length === 0;
  signDocumentButton.disabled = !(hasKeys && hasFile);
  verifyDocumentButton.disabled = !(hasKeys && hasFile && hasSignature);
  verifyTamperedButton.disabled = !(hasKeys && hasFile && hasSignature);
}

function downloadText(filename: string, content: string, type = "text/plain;charset=utf-8"): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
}

async function sha256Hex(data: Uint8Array): Promise<string> {
  const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", buffer));
  return bytesToHex(digest);
}

function resetSignature(): void {
  signature = null;
  signatureArea.value = "";
  setVerification("Sin verificación todavía.", "neutral");
  updateControls();
}

generateKeysButton.addEventListener("click", async () => {
  try {
    generateKeysButton.disabled = true;
    setStatus(keyStatus, "Generando…", "neutral");

    keyPair = await provider.generateKeyPair();
    privatePem = await provider.exportPrivateKey(keyPair.privateKey);
    publicPem = await provider.exportPublicKey(keyPair.publicKey);

    // Round-trip real: se vuelven a importar ambas llaves exportadas.
    await provider.importPrivateKey(privatePem);
    await provider.importPublicKey(publicPem);

    privateKeyPemArea.value = privatePem;
    publicKeyPemArea.value = publicPem;
    csrPem = "";
    csrPemArea.value = "";
    mockResponse.textContent = "Todavía no se ha simulado el envío.";
    resetSignature();

    setStatus(keyStatus, "Llaves válidas", "success");
    log("Par ECDSA P-256 generado, exportado a PEM e importado nuevamente correctamente.");
  } catch (error) {
    console.error(error);
    setStatus(keyStatus, "Error", "error");
    log(`ERROR generando llaves: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    generateKeysButton.disabled = false;
    updateControls();
  }
});

createCsrButton.addEventListener("click", async () => {
  if (!privatePem || !publicPem) return;

  try {
    const privateKey = await provider.importPrivateKey(privatePem);
    const publicKey = await provider.importPublicKey(publicPem);

    csrPem = await createEcdsaP256Csr(privateKey, publicKey, {
      commonName: commonNameInput.value,
      email: emailInput.value,
    });

    csrPemArea.value = csrPem;
    mockResponse.textContent = "CSR creada localmente. Todavía no se ha enviado a ningún endpoint.";
    log("CSR PKCS#10 creada localmente y firmada con ECDSA/SHA-256.");
    updateControls();
  } catch (error) {
    console.error(error);
    log(`ERROR creando CSR: ${error instanceof Error ? error.message : String(error)}`);
    alert(error instanceof Error ? error.message : String(error));
  }
});

sendCsrMockButton.addEventListener("click", () => {
  if (!csrPem) return;
  const mockId = `csr_mock_${crypto.randomUUID()}`;
  const response = {
    http_mock: 202,
    csr_id: mockId,
    algorithm: "ECDSA_P256",
    status: "PENDING",
    message: "CSR recibida correctamente (respuesta simulada; no hubo petición HTTP real).",
    created_at: new Date().toISOString(),
  };
  mockResponse.textContent = JSON.stringify(response, null, 2);
  log(`Envío CSR simulado: ${mockId} quedó en estado PENDING.`);
});

downloadPrivateButton.addEventListener("click", () => downloadText("private_key.pem", privatePem));
downloadPublicButton.addEventListener("click", () => downloadText("public_key.pem", publicPem));
downloadCsrButton.addEventListener("click", () => downloadText("request.csr.pem", csrPem));

documentInput.addEventListener("change", async () => {
  const file = documentInput.files?.[0];
  if (!file) {
    fileBytes = null;
    byId("fileName").textContent = "—";
    byId("fileSize").textContent = "—";
    byId("fileHash").textContent = "—";
    resetSignature();
    return;
  }

  fileBytes = new Uint8Array(await file.arrayBuffer());
  byId("fileName").textContent = file.name;
  byId("fileSize").textContent = formatSize(file.size);
  byId("fileHash").textContent = await sha256Hex(fileBytes);
  resetSignature();
  log(`Archivo cargado: ${file.name} (${file.size} bytes). SHA-256 calculado.`);
  updateControls();
});

signDocumentButton.addEventListener("click", async () => {
  if (!fileBytes || !privatePem) return;
  try {
    // Firma usando una llave reimportada desde el PKCS#8 PEM exportado.
    const privateKey = await provider.importPrivateKey(privatePem);
    signature = await provider.sign(fileBytes, privateKey);
    signatureArea.value = bytesToBase64(signature);
    setVerification(`Firma creada: ${signature.length} bytes raw r || s.`, "success");
    log(`Documento firmado con ECDSA P-256/SHA-256. Firma raw: ${signature.length} bytes.`);
    updateControls();
  } catch (error) {
    console.error(error);
    setVerification("No se pudo firmar el archivo.", "error");
    log(`ERROR firmando: ${error instanceof Error ? error.message : String(error)}`);
  }
});

verifyDocumentButton.addEventListener("click", async () => {
  if (!fileBytes || !signature || !publicPem) return;
  try {
    // Verifica usando una llave reimportada desde el SPKI PEM exportado.
    const publicKey = await provider.importPublicKey(publicPem);
    const valid = await provider.verify(fileBytes, signature, publicKey);
    setVerification(valid ? "✓ Firma válida para el archivo original." : "✗ Firma inválida.", valid ? "success" : "error");
    log(`Verificación del archivo original: ${valid ? "VÁLIDA" : "INVÁLIDA"}.`);
  } catch (error) {
    console.error(error);
    setVerification("Error durante la verificación.", "error");
    log(`ERROR verificando: ${error instanceof Error ? error.message : String(error)}`);
  }
});

verifyTamperedButton.addEventListener("click", async () => {
  if (!fileBytes || !signature || !publicPem) return;
  try {
    const tampered = fileBytes.length === 0 ? new Uint8Array([1]) : new Uint8Array(fileBytes);
    if (tampered.length > 0) tampered[0] ^= 0x01;

    const publicKey = await provider.importPublicKey(publicPem);
    const valid = await provider.verify(tampered, signature, publicKey);
    setVerification(
      valid ? "⚠ El archivo alterado fue aceptado inesperadamente." : "✓ Prueba negativa correcta: el archivo alterado NO verifica.",
      valid ? "error" : "success",
    );
    log(`Prueba con contenido alterado: ${valid ? "ACEPTADO (inesperado)" : "RECHAZADO correctamente"}.`);
  } catch (error) {
    console.error(error);
    setVerification("Error durante la prueba negativa.", "error");
    log(`ERROR en prueba negativa: ${error instanceof Error ? error.message : String(error)}`);
  }
});

updateControls();
