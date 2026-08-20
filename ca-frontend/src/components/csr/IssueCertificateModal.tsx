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
    // Validar fragmentos
    // ------------------------------------------

    const validFragments = fragments.filter(
      (fragment) =>
        fragment.file !== null &&
        fragment.password.trim() !== ""
    );

    // ------------------------------------------
    // Mínimo 3 fragmentos
    // ------------------------------------------

    if (validFragments.length < 3) {
      toast.error(
        "Debe proporcionar al menos 3 fragmentos con sus contraseñas."
      );

      return;
    }

    // ------------------------------------------
    // Detectar fragmentos incompletos
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
    // Preparar fragmentos
    // ------------------------------------------

    const fragmentData: FragmentData[] =
      validFragments.map((fragment) => ({
        file: fragment.file!,
        password: fragment.password,
      }));

    // ------------------------------------------
    // Solicitar emisión
    // ------------------------------------------

    try {
      await mutation.mutateAsync({
        csrId: csr.id,
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
        {/* Información de la CSR */}
        {/* ------------------------------------ */}

        <div className="mb-6">

          <h2 className="text-2xl font-bold">
            Emitir certificado
          </h2>

          <p className="mt-2 text-gray-500">
            Solicitud: {csr.id}
          </p>

          <p className="mt-1 text-gray-500">
            Usuario: {csr.username}
          </p>

          <p className="mt-1 text-gray-500">
            Email: {csr.email || "—"}
          </p>

          <p className="mt-1 text-gray-500">
            Algoritmo: {csr.algorithm}
          </p>

          <p className="mt-1 text-gray-500">
            Estado: {csr.status}
          </p>

          <p className="mt-1 text-gray-500">
            Fecha de solicitud: {csr.created_at}
          </p>

        </div>

        {/* ------------------------------------ */}
        {/* Información de reconstrucción */}
        {/* ------------------------------------ */}

        <div className="mb-6 rounded-lg border border-yellow-300 bg-yellow-50 p-4">

          <h3 className="font-semibold text-yellow-700">
            Reconstrucción de la clave de la CA
          </h3>

          <p className="mt-2 text-sm text-gray-700">
            Proporcione los fragmentos de recuperación
            necesarios para reconstruir temporalmente
            la clave privada de la Autoridad Certificadora.
          </p>

          <p className="mt-2 text-sm text-gray-700">
            Se requieren al menos{" "}
            <strong>3 de 4 fragmentos</strong>.
          </p>

          <p className="mt-2 text-sm font-semibold text-blue-700">
            Use únicamente fragmentos de la raíz {csr.algorithm}.
            La CA selecciona automáticamente la raíz a partir
            del algoritmo registrado en la CSR.
          </p>

          <p className="mt-2 text-sm text-gray-700">
            Para cada archivo .sss introduzca la contraseña del fragmento
            que se eligió al descargarlo, no la contraseña de acceso del custodio.
          </p>

          <p className="mt-2 font-semibold">
            Fragmentos seleccionados:{" "}
            {selectedCount} / 4
          </p>

        </div>

        {/* ------------------------------------ */}
        {/* Fragmentos */}
        {/* ------------------------------------ */}

        <div className="grid gap-4 md:grid-cols-2">

          {fragments.map((_, index) => (
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
        {/* Acciones */}
        {/* ------------------------------------ */}

        <div className="mt-8 flex justify-end gap-4">

          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="rounded-lg border px-5 py-2 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleIssue}
            disabled={
              mutation.isPending ||
              selectedCount < 3
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