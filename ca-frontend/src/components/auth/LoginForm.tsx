import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { login } from "../../services/auth.service";

interface LoginData {
  username: string;
  password: string;
}

export default function LoginForm() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginData>();

  async function onSubmit(data: LoginData) {
    try {
      await login(data);

      toast.success("Bienvenido.");

      navigate("/");
    } catch {
      toast.error("Usuario o contraseña incorrectos.");
    }
  }

  return (
    <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
      <h1 className="mb-2 text-center text-3xl font-bold">
        Autoridad Certificadora
      </h1>

      <p className="mb-8 text-center text-gray-500">
        Panel de administración
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5"
      >
        <div>
          <label className="mb-2 block font-medium">
            Usuario
          </label>

          <input
            className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            {...register("username", {
              required: "Ingrese el usuario",
            })}
          />

          {errors.username && (
            <p className="mt-1 text-sm text-red-500">
              {errors.username.message}
            </p>
          )}
        </div>

        <div>
          <label className="mb-2 block font-medium">
            Contraseña
          </label>

          <input
            type="password"
            className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            {...register("password", {
              required: "Ingrese la contraseña",
            })}
          />

          {errors.password && (
            <p className="mt-1 text-sm text-red-500">
              {errors.password.message}
            </p>
          )}
        </div>

        <button
          disabled={isSubmitting}
          className="w-full rounded-lg bg-blue-600 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}