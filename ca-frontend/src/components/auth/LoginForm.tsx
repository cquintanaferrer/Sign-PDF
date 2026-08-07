import { useForm } from "react-hook-form";
import { login } from "../../services/auth.service";

interface LoginData {
  username: string;
  password: string;
}

export default function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginData>();

  async function onSubmit(data: LoginData) {
    try {
      await login(data);

      // después redirigiremos al dashboard
      alert("Login correcto");
    } catch {
      alert("Usuario o contraseña incorrectos");
    }
  }

  return (
    <div className="w-full max-w-md rounded-xl bg-white shadow-lg p-8">

      <h1 className="text-3xl font-bold text-center mb-2">
        Autoridad Certificadora
      </h1>

      <p className="text-center text-gray-500 mb-8">
        Panel de administración
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5"
      >
        <div>
          <label className="block mb-2 font-medium">
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
          <label className="block mb-2 font-medium">
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
          className="w-full rounded-lg bg-blue-600 py-2 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-50"
        >
          {isSubmitting ? "Ingresando..." : "Ingresar"}
        </button>
      </form>

    </div>
  );
}