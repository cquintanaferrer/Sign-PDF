console.log("Simulando descarga de script del equipo CA...");

window.generateKeyPair = function() {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                publicKey: "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...[LLAVE FALSA DE PRUEBA]...\n-----END PUBLIC KEY-----",
                privateKey: "-----BEGIN PRIVATE KEY-----\n[SECRETO LOCAL]...\n-----END PRIVATE KEY-----"
            });
        }, 1500); // Simulamos 1.5 segundos de trabajo criptográfico pesado
    });
};
