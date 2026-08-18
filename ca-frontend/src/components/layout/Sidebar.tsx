import { NavLink } from "react-router-dom";

export default function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 text-white">

      <div className="p-6 text-2xl font-bold">
        CA Admin
      </div>

      <nav className="flex flex-col">

        <NavLink className="px-6 py-3 hover:bg-slate-700" to="/">
          Dashboard
        </NavLink>

        <NavLink className="px-6 py-3 hover:bg-slate-700" to="/bootstrap">
          Raíces CA
        </NavLink>

        <NavLink className="px-6 py-3 hover:bg-slate-700" to="/certificates">
          Certificados
        </NavLink>

        <NavLink className="px-6 py-3 hover:bg-slate-700" to="/pending-csr">
          CSR Pendientes
        </NavLink>


      </nav>

    </aside>
  );
}