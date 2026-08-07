import { useState } from "react";

import { downloadFile } from "../../utils/download";

interface Props {
  filename: string;
  content: string;
  disabled: boolean;
}

export default function DownloadCard({
  filename,
  content,
  disabled,
}: Props) {

  const [downloaded, setDownloaded] = useState(false);

  function handleDownload() {

    if (downloaded || disabled) return;

    downloadFile(filename, content);

    setDownloaded(true);

  }

  return (

    <div className="rounded-xl bg-white shadow p-5">

      <h2 className="font-semibold mb-4">

        {filename}

      </h2>

      <button
        onClick={handleDownload}
        disabled={downloaded || disabled}
        className="w-full rounded-lg bg-blue-600 py-2 text-white disabled:bg-gray-400"
      >

        {downloaded
          ? "Descargado"
          : disabled
          ? "Expirado"
          : "Descargar"}

      </button>

    </div>

  );

}