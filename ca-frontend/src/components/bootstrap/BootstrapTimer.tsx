interface Props {
  timeLeft: number;
}

export default function BootstrapTimer({ timeLeft }: Props) {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4">

      <h2 className="font-bold text-yellow-700">
        Tiempo restante para descargar
      </h2>

      <p className="mt-3 text-4xl font-bold text-red-600">

        {minutes.toString().padStart(2, "0")}:
        {seconds.toString().padStart(2, "0")}

      </p>

    </div>
  );
}