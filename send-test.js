/**
 * TESTE SIMPLES – ENVIO DE SMS VIA GOHIGHLEVEL
 * Script hardcoded apenas para validação antes do commit
 */

import axios from 'axios';

// ================================
// CONFIGURAÇÕES (HARD CODE)
// ================================
const PIT_TOKEN = 'pit-af7c21aa-7057-4de5-8c78-ef435182bfa1';
const LOCATION_ID = 'EJoBWKAGbBtYNTMkbLXD';
const CONTACT_ID = 'lINzfJt8GA1oJbWhQXNu';
const API_VERSION = '2021-04-15';

// Endpoint oficial
const GHL_ENDPOINT = 'https://services.leadconnectorhq.com/conversations/messages';

// Mensagem de teste
const MESSAGE_TEXT = '🚀 Teste de envio SMS via integração API (ZOI CRM)';

// ================================
// FUNÇÃO DE ENVIO
// ================================
async function sendTestSMS() {
  try {
    const response = await axios.post(
      GHL_ENDPOINT,
      {
        locationId: LOCATION_ID,
        contactId: CONTACT_ID,
        type: 'SMS',
        message: MESSAGE_TEXT
      },
      {
        headers: {
          Authorization: `Bearer ${PIT_TOKEN}`,
          Version: API_VERSION,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        timeout: 15000
      }
    );

    console.log('✅ SMS ENVIADO COM SUCESSO');
    console.log('Resposta da API:');
    console.log(JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('❌ ERRO AO ENVIAR SMS');

    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Resposta:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Erro:', error.message);
    }
  }
}

// ================================
// EXECUÇÃO
// ================================
sendTestSMS();
