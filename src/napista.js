import axios from 'axios';
import dotenv from 'dotenv';
import { saveToken, getRefreshToken, getToken } from './tokenStorage.js';

dotenv.config();

/**
 * Retorna uma instância do Axios com o token de autorização.
 * Opcionalmente, pode adicionar lógica de refresh automático aqui.
 * @returns {import('axios').AxiosInstance}
 */
function getApiClient() {
  const token = getToken();
  if (!token) {
    throw new Error('Token de acesso não encontrado.');
  }

  const apiClient = axios.create({
    baseURL: process.env.NAPISTA_API_URL, // Ex: https://api.napista.com.br
    headers: {
      Authorization: `Bearer ${token.access_token}`,
    },
  });

  // (Opcional) Interceptor para lidar com token expirado e tentar renovar
  // apiClient.interceptors.response.use(
  //   (response) => response,
  //   async (error) => {
  //     const originalRequest = error.config;
  //     if (error.response.status === 401 && !originalRequest._retry) {
  //       originalRequest._retry = true;
  //       await refreshToken();
  //       const newToken = getToken();
  //       originalRequest.headers['Authorization'] = `Bearer ${newToken.access_token}`;
  //       return apiClient(originalRequest);
  //     }
  //     return Promise.reject(error);
  //   }
  // );

  return apiClient;
}

export async function exchangeCodeForToken(code) {
  const params = new URLSearchParams();
  params.append('grant_type', 'authorization_code');
  params.append('client_id', process.env.NAPISTA_CLIENT_ID);
  params.append('code', code);
  params.append('redirect_uri', process.env.NAPISTA_REDIRECT_URI);

  const response = await axios.post(
    process.env.NAPISTA_TOKEN_URL,
    params.toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );

  // 🔐 Salva tokens no JSON
  saveToken(response.data);

  return response.data;
}

/**
 * Renova o access_token usando o refresh_token.
 */
export async function refreshToken() {
  const currentRefreshToken = getRefreshToken();
  if (!currentRefreshToken) {
    throw new Error('Refresh token não encontrado.');
  }

  const params = new URLSearchParams();
  params.append('grant_type', 'refresh_token');
  params.append('client_id', process.env.NAPISTA_CLIENT_ID);
  params.append('refresh_token', currentRefreshToken);

  const response = await axios.post(
    process.env.NAPISTA_TOKEN_URL,
    params.toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  // Sobrescreve o token antigo com os novos dados
  saveToken(response.data);

  return response.data;
}

/**
 * Exemplo de busca de dados em um endpoint protegido.
 */
export async function fetchMyUserData() {
  const apiClient = getApiClient();
  // Este endpoint é um exemplo, substitua pelo endpoint real da API NaPista
  const response = await apiClient.get('/dados-usuario');
  return response.data;
}
