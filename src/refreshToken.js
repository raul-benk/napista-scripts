import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const TOKEN_PATH = path.resolve(
  '/Users/raulbehnke/Documents/TopCar/NaPista/data/napista-tokens.json'
);

async function refreshToken() {
  const raw = fs.readFileSync(TOKEN_PATH, 'utf-8');
  const tokens = JSON.parse(raw);

  if (!tokens.refresh_token) {
    throw new Error('refresh_token não encontrado.');
  }

  try {
    const response = await axios.post(
      process.env.NAPISTA_TOKEN_URL,
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.NAPISTA_CLIENT_ID,
        refresh_token: tokens.refresh_token
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const newTokens = {
      ...tokens,
      ...response.data,
      updated_at: new Date().toISOString()
    };

    fs.writeFileSync(
      TOKEN_PATH,
      JSON.stringify(newTokens, null, 2)
    );

    console.log('✅ Token renovado com sucesso!');
    return newTokens.access_token;

  } catch (error) {
    console.error('❌ Erro ao renovar token');

    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Resposta:', error.response.data);
    } else {
      console.error(error.message);
    }

    throw error;
  }
}

refreshToken();
