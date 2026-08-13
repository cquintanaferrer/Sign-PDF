import { useState } from "react";
import toast from "react-hot-toast";

import { CSR } from "../../types/csr";
import { useIssueCertificate } from "../../hooks/useIssueCertificate";

import FragmentUploader from "./FragmentUploader";
import { FragmentData } from "../../services/csr.service";

interface Props {
  csr: CSR;
  onClose: () => void;
}

interface FragmentState {
  file: File | null;
  password: string;
}

export default function IssueCertificateModal({
  csr,
  onClose,
}: Props) {
  const mutation = useIssueCertificate();

  // CSR que será enviada al servicio de CA.
  // Temporalmente seleccionaremos test_request.csr
  // para realizar la prueba de emisión.
  const [csrFile, setCsrFile] =
    useState<File | null>(null);

  const [fragments, setFragments] = useState<
    FragmentState[]
  >([
    { file: null, password: "" },
    { file: null, password: "" },
    { file: null, password: "" },
    { file: null, password: "" },
  ]);

  function updateFragment(
    index: number,
    file: File | null,
    password: string
  ) {
    setFragments((previous) => {
      const updated = [...previous];

      updated[index] = {
        file,
        password,
      };

      return updated;
    });
  }

  async function handleIssue() {
    // ------------------------------------------
    // 1. Validar CSR
    // ------------------------------------------

    if (!csrFile) {
      toast.error(
        "Debe seleccionar la CSR que será firmada."
      );

      return;
    }

    // ------------------------------------------
    // 2. Obtener fragmentos completos
    // ------------------------------------------

    const validFragments = fragments.filter(
      (fragment) =>
        fragment.file !== null &&
        fragment.password.trim() !== ""
    );

    // ------------------------------------------
    // 3. Mínimo 3 fragmentos
    // ------------------------------------------

    if (validFragments.length < 3) {
      toast.error(
        "Debe proporcionar al menos 3 fragmentos con sus contraseñas."
      );

      return;
    }

    // ------------------------------------------
    // 4. Detectar fragmentos incompletos
    // ------------------------------------------

    const incompleteFragments = fragments.some(
      (fragment) =>
        (fragment.file !== null &&
          !fragment.password.trim()) ||
        (fragment.file === null &&
          fragment.password.trim() !== "")
    );

    if (incompleteFragments) {
      toast.error(
        "Cada fragmento seleccionado debe tener su contraseña."
      );

      return;
    }

    // ------------------------------------------
    // 5. Preparar fragmentos
    // ------------------------------------------

    const fragmentData: FragmentData[] =
      validFragments.map((fragment) => ({
        file: fragment.file!,
        password: fragment.password,
      }));

    // ------------------------------------------
    // 6. Enviar al backend
    // ------------------------------------------

    try {
      await mutation.mutateAsync({
        csrFile,
        fragments: fragmentData,
      });

      toast.success(
        "Certificado emitido correctamente."
      );

      onClose();

    } catch (error: any) {

      console.error(
        "Error al emitir certificado:",
        error
      );

      const detail =
        error?.response?.data?.detail;

      toast.error(
        detail ||
        "No fue posible emitir el certificado."
      );
    }
  }

  const selectedCount = fragments.filter(
    (fragment) => fragment.file !== null
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-8">

        {/* ------------------------------------ */}
        {/* Encabezado */}
        {/* ------------------------------------ */}

        <div className="mb-6">

          <h2 className="text-2xl font-bold">
            Emitir certificado
          </h2>

          <p className="mt-2 text-gray-500">
            CSR: {csr.id}
          </p>

          <p className="mt-1 text-gray-500">
            Usuario: {csr.username}
          </p>

        </div>

        {/* ------------------------------------ */}
        {/* CSR */}
        {/* ------------------------------------ */}

        <div className="mb-6 rounded-lg border border-blue-300 bg-blue-50 p-4">

          <h3 className="font-semibold text-blue-700">
            CSR del solicitante
          </h3>

          <p className="mt-2 text-sm text-gray-700">
            Seleccione el archivo CSR que será firmado
            por la Autoridad Certificadora.
          </p>

          <input
            type="file"
            accept=".csr,.pem"
            onChange={(event) => {
              setCsrFile(
                event.target.files?.[0] ?? null
              );
            }}
            className="mt-4 block w-full text-sm"
          />

          {csrFile && (
            <p className="mt-2 text-sm text-green-600">
              ✓ CSR seleccionada: {csrFile.name}
            </p>
          )}

        </div>

        {/* ------------------------------------ */}
        {/* Reconstrucción */}
        {/* ------------------------------------ */}

        <div className="mb-6 rounded-lg border border-yellow-300 bg-yellow-50 p-4">

          <h3 className="font-semibold text-yellow-700">
            Reconstrucción de la clave de la CA
          </h3>

          <p className="mt-2 text-sm text-gray-700">
            Seleccione entre 3 y 4 fragmentos de Shamir.
            Cada fragmento debe acompañarse de la
            contraseña correspondiente a su custodio.
          </p>

          <p className="mt-2 font-semibold">
            Fragmentos seleccionados:{" "}
            {selectedCount} / 4
          </p>

          <p className="text-sm text-gray-600">
            Mínimo requerido: 3 fragmentos.
          </p>

        </div>

        {/* ------------------------------------ */}
        {/* Fragmentos */}
        {/* ------------------------------------ */}

        <div className="grid gap-4 md:grid-cols-2">

          {fragments.map((fragment, index) => (
            <FragmentUploader
              key={index}
              fragmentNumber={index + 1}
              onChange={(file, password) =>
                updateFragment(
                  index,
                  file,
                  password
                )
              }
            />
          ))}

        </div>

        {/* ------------------------------------ */}
        {/* Botones */}
        {/* ------------------------------------ */}

        <div className="mt-8 flex justify-end gap-4">

          <button
            onClick={onClose}
            disabled={mutation.isPending}
            className="rounded-lg border px-5 py-2"
          >
            Cancelar
          </button>

          <button
            onClick={handleIssue}
            disabled={
              mutation.isPending ||
              selectedCount < 3 ||
              !csrFile
            }
            className="rounded-lg bg-blue-600 px-5 py-2 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mutation.isPending
              ? "Firmando..."
              : "Firmar certificado"}
          </button>

        </div>

      </div>

    </div>
  );
}