interface Props {
  label: string;
  onChange: (file: File | null) => void;
}

export default function FragmentUploader({
  label,
  onChange,
}: Props) {
  return (
    <div>

      <label className="block mb-2 font-medium">
        {label}
      </label>

      <input
        type="file"
        accept=".sss"
        onChange={(e) =>
          onChange(e.target.files?.[0] ?? null)
        }
      />

    </div>
  );
}