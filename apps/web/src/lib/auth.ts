import api from './api';
import { AuthResponse, AuthTokens, LoginRequest } from '@fieldops/shared';

export async function loginApi(credentials: LoginRequest): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/login', credentials);
  return response.data;
}

export async function registerApi(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
}): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/register', data);
  return response.data;
}

export async function refreshTokensApi(refreshToken: string): Promise<AuthTokens> {
  const response = await api.post<AuthTokens>('/auth/refresh', { refreshToken });
  return response.data;
}

export async function logoutApi(): Promise<void> {
  await api.post('/auth/logout');
}

export async function getMeApi() {
  const response = await api.get('/auth/me');
  return response.data;
}
