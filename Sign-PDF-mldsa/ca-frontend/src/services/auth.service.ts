import api from "../api/axios";
import { tokenStorage } from "../utils/token";

interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  access_token: string;
}

export async function login(data: LoginRequest) {
  const response = await api.post<LoginResponse>("/auth/login", data);

  tokenStorage.set(response.data.access_token);

  return response.data;
}

export function logout() {
  tokenStorage.remove();
}

export function isAuthenticated() {
  return tokenStorage.has();
}

export async function getProfile() {
  const response = await api.get("/auth/profile");

  return response.data;
}