import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createObjectCsvWriter } from 'csv-writer';

dotenv.config();

// ===== CONFIG =====
const SELLER_ID = process.env.SELLER_ID || '81c17811-01ef-4e43-b416-773a9c851a38';
const PAGE_SIZE = 500;
const OUTPUT_PATH = path.resolve('./data/leads-mugcar.csv');
const TOKEN_PATH = path.resolve(
  '/Users/raulbehnke/Documents/TopCar/NaPista/data/napista-tokens.json'
);

// ===== TOKEN =====
function getAccessToken() {
  const raw = fs.readFileSync(TOKEN_PATH, 'utf-8');
  const parsed = JSON.parse(raw);

  if (!parsed.access_token) {
    throw new Error('access_token não encontrado.');
  }

  return parsed.access_token;
}

// ===== API =====
const api = axios.create({
  baseURL: process.env.NAPISTA_API_BASE_URL,
  headers: {
    Accept: 'application/json'
  }
});

// ===== BUSCAR TODOS OS LEADS (PAGINADO) =====
async function fetchAllLeads(token) {
  let page = 1;
  let allLeads = [];
  let totalPages = 1;

  do {
    const response = await api.get(
      `/seller/${SELLER_ID}/leads`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page,
          size: PAGE_SIZE
        }
      }
    );

    const { pageData, totalPages: tp } = response.data;

    allLeads.push(...pageData);
    totalPages = tp;

    console.log(`📥 Página ${page}/${totalPages} — ${pageData.length} leads`);
    page++;

  } while (page <= totalPages);

  return allLeads;
}

// ===== CSV =====
async function exportToCSV(leads) {
  const csvWriter = createObjectCsvWriter({
    path: OUTPUT_PATH,
    header: [
      { id: 'id', title: 'Lead ID' },
      { id: 'clientName', title: 'Nome' },
      { id: 'clientEmail', title: 'Email' },
      { id: 'phone', title: 'Telefone' },
      { id: 'vehicleVersion', title: 'Veículo' },
      { id: 'vehiclePlate', title: 'Placa' },
      { id: 'contactMessage', title: 'Mensagem' },
      { id: 'clientCreditStatus', title: 'Status Crédito' },
      { id: 'updatedAt', title: 'Última Atualização' }
    ]
  });

  const records = leads.map(lead => ({
    id: lead.id,
    clientName: lead.clientName,
    clientEmail: lead.clientEmail || '',
    phone: lead.clientPhone
      ? `(${lead.clientPhone.areaCode}) ${lead.clientPhone.number}`
      : '',
    vehicleVersion: lead.vehicleVersion,
    vehiclePlate: lead.vehiclePlate || '',
    contactMessage: lead.contactMessage || '',
    clientCreditStatus: lead.clientCreditStatus || '',
    updatedAt: lead.updatedAt
  }));

  await csvWriter.writeRecords(records);
  console.log(`\n✅ CSV gerado com sucesso: ${OUTPUT_PATH}`);
}

// ===== MAIN =====
async function run() {
  try {
    const token = getAccessToken();
    const leads = await fetchAllLeads(token);

    console.log(`\n📊 Total de leads encontrados: ${leads.length}`);
    await exportToCSV(leads);

  } catch (error) {
    console.error('\n❌ Erro ao exportar leads');

    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Resposta:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

run();
