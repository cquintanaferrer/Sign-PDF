import { useNavigate } from "react-router-dom";

import { logout } from "../../services/auth.service";

export default function Navbar() {
  const navigate = useNavigate();

  function handleLogout() {
      logout();
  
      navigate("/login");
  }
  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-6">
      <h1 className="text-xl font-bold">
        Autoridad Certificadora
      </h1>

      <button
        onClick={handleLogout}
        className="text-red-600 hover:text-red-700">
        Cerrar sesión
      </button>
    </header>
  );
}