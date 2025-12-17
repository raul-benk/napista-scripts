// send-on-token.js
'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// ======================================================
// CONFIGURAÇÕES HARDCODED (APENAS PARA TESTE)
// ======================================================

const TOKEN_FILE = path.join(__dirname, 'data', 'napista-tokens.json');

// GoHighLevel – Private Integration
const PIT_TOKEN = 'pit-af7c21aa-7057-4de5-8c78-ef435182bfa1';
const LOCATION_ID = 'EJoBWKAGbBtYNTMkbLXD';
const CONTACT_ID = 'lINzfJt8GA1oJbWhQXNu';
const API_VERSION = '2021-04-15';

// Endpoint oficial GHL
const SEND_ENDPOINT = 'https://services.leadconnectorhq.com/conversations/messages';

// ======================================================
// LEITURA DO TOKEN (NAPISTA) – apenas para gatilho
// ======================================================
function readTokenFromFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(raw);
    return (
      json.private_integration_token ||
      json.pit_token ||
      json.token ||
      json.access_token ||
      null
    );
  } catch (err) {
    return null;
  }
}

// ======================================================
// ENVIO DE SMS VIA GHL
// ======================================================
async function sendSms({ text }) {
  const body = {
    locationId: LOCATION_ID,
    contactId: CONTACT_ID,
    type: 'SMS',
    message: text
  };

  const headers = {
    Authorization: `Bearer ${PIT_TOKEN}`,
    Version: API_VERSION,
    'Content-Type': 'application/json',
    Accept: 'application/json'
  };

  const response = await axios.post(SEND_ENDPOINT, body, {
    headers,
    timeout: 15000
  });

  return response.data;
}

// ======================================================
// WATCHER DO ARQUIVO DE TOKENS (NAPISTA)
// ======================================================
function watchFileAndSend() {
  console.log(`[watch] observando ${TOKEN_FILE} para alterações...`);

  let timer = null;
  let lastToken = readTokenFromFile(TOKEN_FILE);

  async function handler() {
    try {
      const currentToken = readTokenFromFile(TOKEN_FILE);

      if (!currentToken || currentToken === lastToken) {
        return;
      }

      lastToken = currentToken;

      const message =
        '🚀 Integração ativa: token recebido com sucesso no CRM (teste automático).';

      console.log('[send] enviando SMS de confirmação...');
      const res = await sendSms({ text: message });

      console.log('[send] SMS enviado com sucesso:');
      console.log(JSON.stringify(res, null, 2));
    } catch (err) {
      if (err.response) {
        console.error('[send] erro GHL:', err.response.status);
        console.error(JSON.stringify(err.response.data, null, 2));
      } else {
        console.error('[send] erro:', err.message);
      }
    }
  }

  if (fs.existsSync(TOKEN_FILE)) {
    lastToken = readTokenFromFile(TOKEN_FILE);
  }

  fs.watch(TOKEN_FILE, { persistent: true }, () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(handler, 800);
  });
}

// ======================================================
// ENVIO MANUAL (SEM WATCH)
// ======================================================
async function sendOnce() {
  try {
    const message =
      '📩 Teste manual de envio SMS via API GoHighLevel (ZOI CRM).';

    const res = await sendSms({ text: message });

    console.log('✅ SMS enviado com sucesso (manual):');
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    if (err.response) {
      console.error('❌ Erro GHL:', err.response.status);
      console.error(JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('❌ Erro:', err.message);
    }
  }
}

// ======================================================
// EXECUÇÃO
// ======================================================
if (require.main === module) {
  const MODE = process.argv[2]; // "send" ou vazio

  if (MODE === 'send') {
    sendOnce();
  } else {
    watchFileAndSend();
  }
}

module.exports = { sendOnce, watchFileAndSend };
