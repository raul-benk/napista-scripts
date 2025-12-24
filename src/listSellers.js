// src/listSellers.js
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Caminho absoluto do token
const TOKEN_PATH = path.resolve(
  '/Users/raulbehnke/Documents/TopCar/NaPista/data/napista-tokens.json'
);

function getAccessToken() {
  if (!fs.existsSync(TOKEN_PATH)) {
    throw new Error('Arquivo napista-tokens.json não encontrado.');
  }

  const raw = fs.readFileSync(TOKEN_PATH, 'utf-8');
  const parsed = JSON.parse(raw);

  if (!parsed.access_token) {
    throw new Error('access_token não encontrado no arquivo.');
  }

  return parsed.access_token;
}

async function listarLojas() {
  try {
    const token = getAccessToken();

    const response = await axios.get(
      `${process.env.NAPISTA_API_BASE_URL}/seller/access`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json'
        }
      }
    );

    console.log('\n✅ Lojas encontradas:\n');

    response.data.sellers.forEach((seller, i) => {
      console.log(`🏢 Loja ${i + 1}`);
      console.log(`ID: ${seller.sellerId}`);
      console.log(`Nome: ${seller.name}`);
      console.log(`Documento: ${seller.sellerDocument}`);
      console.log('------------------------');
    });

  } catch (error) {
    console.error('\n❌ Erro ao listar lojas');

    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Resposta:', error.response.data || '(vazio)');
    } else {
      console.error(error.message);
    }
  }
}

listarLojas();
