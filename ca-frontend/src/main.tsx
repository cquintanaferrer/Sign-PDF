import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from "react-hot-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from './App';
import './index.css'; // Opcional: tu archivo de estilos globales o Tailwind

const rootElement = document.getElementById('root');
const queryClient = new QueryClient();

if (!rootElement) {
  throw new Error("No se encontró el elemento 'root' en el index.html");
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster position="top-right" />
    </QueryClientProvider>
  </StrictMode>
);