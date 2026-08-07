import { useProfile } from "../hooks/useProfile";

export default function Profile() {

  const {
    data,
    isLoading,
    isError,
  } = useProfile();

  if (isLoading) {
    return <p>Cargando perfil...</p>;
  }

  if (isError || !data) {
    return <p>No fue posible cargar el perfil.</p>;
  }

  return (
    <div className="space-y-6">

      <h1 className="text-3xl font-bold">
        Perfil
      </h1>

      <div className="rounded-xl bg-white shadow p-6">

        <div className="space-y-4">

          <p>
            <strong>Usuario:</strong> {data.username}
          </p>

          <p>
            <strong>Email:</strong> {data.email}
          </p>

          <p>
            <strong>Rol:</strong> {data.role}
          </p>

        </div>

      </div>

    </div>
  );

}