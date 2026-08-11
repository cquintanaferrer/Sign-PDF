import { useState } from "react";

interface Props {
  fragmentNumber: number;
  onChange: (file: File | null, password: string) => void;
}

export default function FragmentUploader({
  fragmentNumber,
  onChange,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile = event.target.files?.[0] ?? null;

    setFile(selectedFile);

    onChange(selectedFile, password);
  }

  function handlePasswordChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const newPassword = event.target.value;

    setPassword(newPassword);

    onChange(file, newPassword);
  }

  return (
    <div className="rounded-lg border p-4">

      <h3 className="mb-4 font-semibold">
        Fragmento {fragmentNumber}
      </h3>

      <div>
        <label className="mb-2 block text-sm font-medium">
          Archivo del fragmento
        </label>

        <input
          type="file"
          accept=".sss"
          onChange={handleFileChange}
          className="w-full"
        />
      </div>

      <div className="mt-4">
        <label className="mb-2 block text-sm font-medium">
          Contraseña del cuidador
        </label>

        <input
          type="password"
          value={password}
          onChange={handlePasswordChange}
          placeholder="Contraseña"
          className="w-full rounded-lg border px-3 py-2"
        />
      </div>

      {file && (
        <p className="mt-2 text-sm text-green-600">
          ✓ {file.name}
        </p>
      )}

    </div>
  );
}