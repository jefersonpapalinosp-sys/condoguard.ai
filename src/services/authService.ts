import { requestJson } from './http';

export type LoginResponse = {
  token: string;
  role: 'admin' | 'sindico' | 'morador';
  expiresAt: number;
  condominiumId?: number | null;
  userName?: string | null;
  name?: string | null;
};

export async function loginWithPassword(email: string, password: string) {
  return requestJson<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}
