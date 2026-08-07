import { downloadFile } from "../../utils/download";

interface Props {
  filename: string;
  content: string;
}

export default function DownloadCard({
  filename,
  content,
}: Props) {
  return (
    <div className="rounded-xl bg-white shadow p-5">

      <h2 className="font-semibold mb-4">
        {filename}
      </h2>

      <button
        onClick={() => downloadFile(filename, content)}
        className="w-full rounded-lg bg-blue-600 py-2 text-white"
      >
        Descargar
      </button>

    </div>
  );
}