import { useState } from "react";
import toast from "react-hot-toast";

import FragmentUploader from "../csr/FragmentUploader";

import { useRotateCA } from "../../hooks/useRotateCA";
import { RotateCAFragment } from "../../services/ca.service";

interface Props {
  onClose: () => void;
  onSuccess: (response: any) => void;
}

interface FragmentState {
  file: File | null;
  password: string;
}

export default function RotateCAModal({
  onClose,
  onSuccess,
}: Props) {
  const mutation = useRotateCA();

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

  async function handleRotate() {
    const validFragments = fragments.filter(
      (fragment) =>
        fragment.file !== null &&
        fragment.password.trim() !== ""
    );

    if (validFragments.length < 3) {
      toast.error(
        "Debe proporcionar al menos 3 fragmentos con sus contraseñas."
      );

      return;
    }

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

    const fragmentData: RotateCAFragment[] =
      validFragments.map((fragment) => ({
        file: fragment.file!,
        password: fragment.password,
      }));

    const confirmed = window.confirm(
      "Esta operación generará una nueva Autoridad Certificadora y dejará inactiva la CA actual.\n\n" +
        "La clave de la CA actual será reconstruida temporalmente para firmar el certificado cruzado.\n\n" +
        "¿Desea continuar?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const response =
        await mutation.mutateAsync(
          fragmentData
        );

      toast.success(
        "La Autoridad Certificadora fue rotada correctamente."
      );

      onSuccess(response);

    } catch (error: any) {
      console.error(
        "Error al rotar CA:",
        error
      );

      const detail =
        error?.response?.data?.detail;

      toast.error(
        detail ||
          "No fue posible reiniciar la Autoridad Certificadora."
      );
    }
  }

  const selectedCount = fragments.filter(
    (fragment) => fragment.file !== null
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-8">

        <div className="mb-6">
          <h2 className="text-2xl font-bold">
            Reiniciar Autoridad Certificadora
          </h2>

          <p className="mt-2 text-gray-500">
            Para realizar la rotación se necesitan
            al menos 3 de los 4 fragmentos de la
            CA actual.
          </p>
        </div>

        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4">
          <h3 className="font-semibold text-red-700">
            Operación crítica
          </h3>

          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-700">
            <li>
              La clave de la CA actual será
              reconstruida temporalmente.
            </li>

            <li>
              Se generará una nueva clave privada
              para la nueva CA.
            </li>

            <li>
              La CA actual firmará el certificado
              cruzado de la nueva CA.
            </li>

            <li>
              La CA actual quedará inactiva.
            </li>

            <li>
              Se generarán cuatro nuevos fragmentos.
            </li>

            <li>
              Se requieren al menos 3 fragmentos
              para realizar la operación.
            </li>
          </ul>
        </div>

        <div className="mb-6 rounded-lg border border-yellow-300 bg-yellow-50 p-4">
          <h3 className="font-semibold text-yellow-700">
            Reconstrucción de la clave
          </h3>

          <p className="mt-2 text-sm text-gray-700">
            Introduzca nuevamente las contraseñas
            de los custodios junto con sus fragmentos.
          </p>

          <p className="mt-2 font-semibold">
            Fragmentos seleccionados:{" "}
            {selectedCount} / 4
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {fragments.map(
            (fragment, index) => (
              <FragmentUploader
                key={index}
                fragmentNumber={index + 1}
                onChange={(
                  file,
                  password
                ) =>
                  updateFragment(
                    index,
                    file,
                    password
                  )
                }
              />
            )
          )}
        </div>

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
            onClick={handleRotate}
            disabled={
              mutation.isPending ||
              selectedCount < 3
            }
            className="rounded-lg bg-red-600 px-5 py-2 text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mutation.isPending
              ? "Reiniciando CA..."
              : "Reiniciar CA"}
          </button>
        </div>

      </div>
    </div>
  );
}