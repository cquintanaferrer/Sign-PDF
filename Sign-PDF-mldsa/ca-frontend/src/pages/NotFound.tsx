import { Link } from "react-router-dom";

export default function NotFound() {

    return (

        <div className="flex h-screen flex-col items-center justify-center">

            <h1 className="text-8xl font-bold">
                404
            </h1>

            <p className="mt-4">
                Página no encontrada.
            </p>

            <Link
                to="/"
                className="mt-8 rounded bg-blue-600 px-6 py-3 text-white"
            >
                Ir al Dashboard
            </Link>

        </div>

    );

}