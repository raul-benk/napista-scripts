import axios from 'axios';
import dotenv from 'dotenv';
import { saveToken } from './tokenStorage.js';

dotenv.config();

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
