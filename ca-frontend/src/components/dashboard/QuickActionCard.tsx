import { Link } from "react-router-dom";

interface Props {
  title: string;
  description: string;
  route: string;
}

export default function QuickActionCard({
  title,
  description,
  route,
}: Props) {
  return (
    <Link
      to={route}
      className="rounded-xl bg-white shadow p-6 hover:shadow-lg transition"
    >
      <h2 className="text-lg font-semibold">
        {title}
      </h2>

      <p className="mt-2 text-gray-500">
        {description}
      </p>
    </Link>
  );
}