import axios from "axios";
import { tokenStorage } from "../utils/token";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = tokenStorage.get();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Cuando enviamos FormData, dejamos que Axios/browser
  // establezca automáticamente multipart/form-data
  // junto con su boundary.
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }

  return config;
});

export default api;