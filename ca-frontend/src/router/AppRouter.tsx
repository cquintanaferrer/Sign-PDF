import { BrowserRouter, Routes, Route } from "react-router-dom";
import PrivateRoute from "./PrivateRoute";

import ProtectedLayout from "../components/layout/ProtectedLayout";

import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import BootstrapCA from "../pages/BootstrapCA";
import Certificates from "../pages/Certificates";
import PendingCSR from "../pages/PendingCSR";
import NotFound from "../pages/NotFound";

export default function AppRouter() {
  return (
    <BrowserRouter>

      <Routes>

        <Route path="/login" element={<Login />} />

        <Route element={
          <PrivateRoute>
          <ProtectedLayout />
          </PrivateRoute>
        }>

          <Route path="/" element={<Dashboard />} />

          <Route path="/bootstrap" element={<BootstrapCA />} />

          <Route path="/certificates" element={<Certificates />} />

          <Route path="/pending-csr" element={<PendingCSR />} />

          <Route path="*" element={<NotFound />}/>


        </Route>

      </Routes>

    </BrowserRouter>
  );
}