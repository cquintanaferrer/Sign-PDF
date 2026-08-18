import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function ProtectedLayout() {
  return (
    <div className="h-screen flex">

      <Sidebar />

      <div className="flex flex-col flex-1">

        <Navbar />

        <main className="flex-1 bg-slate-100 p-6 overflow-auto">
          <Outlet />
        </main>

        <Footer />

      </div>

    </div>
  );
}