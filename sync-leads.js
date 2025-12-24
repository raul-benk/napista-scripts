import fs from 'fs'
import path from 'path'
import axios from 'axios'
import dotenv from 'dotenv'
import { getApiClient } from './src/napista.js'

dotenv.config()

// ================= CONFIGURAÇÕES =================

// --- GHL ---
const LOCATION_ID = process.env.LOCATION_ID
const GHL_API_KEY = process.env.GHL_API_KEY
const PIPELINE_ID = '1d36lApsx8bp3zeIyNak'
const STAGE_ID = 'ba1b90b4-be01-4b09-b27c-cd0cf764e084'

const CF_CONTACT = {
  creditStatus: 'XYHdC0yVsKbdj1SKs0jD',
  source: 'jp0BQUNc3pBu3C7sJEzp',
  plate: 'k43qkNnzYqeIUU55av77',
  vehicle: 'vkdEAtY6AZqydR0USnFN'
}
const CF_OPPORTUNITY = {
  vehicle: 'yX7o3eEtVZ6Syqvmy3UC',
  message: 'WV7nlltYfD80H5tV4ttP'
}

// --- SINCRONIZAÇÃO ---
const SYNC_INTERVAL_MINUTES = 10
const DATA_DIR = './data'
const PROCESSED_LEADS_PATH = path.join(DATA_DIR, 'processed-leads.json')


// ================= ORQUESTRADOR DO SERVIÇO =================

let isProcessing = false // Trava para evitar execuções sobrepostas

/**
 * Função principal que orquestra a busca e importação de leads.
 */
async function processLeads() {
  if (isProcessing) {
    console.log(`[INFO] Sincronização anterior ainda em andamento. Pulando este ciclo.`)
    return
  }
  isProcessing = true
  console.log(`\n🚀 [${new Date().toLocaleString('pt-BR')}] Iniciando ciclo de sincronização...`)
  
  try {
    const allLeads = await fetchLeadsFromNaPistaAPI()
    const processedLeadIds = loadProcessedLeadIds()

    const newLeads = allLeads.filter(lead => {
        if (!lead || !lead.id) {
            console.warn('⚠️ [AVISO] Lead inválido ou sem ID encontrado na API, será ignorado:', lead)
            return false
        }
        return !processedLeadIds.has(lead.id)
    })

    if (newLeads.length === 0) {
      console.log('✅ [INFO] Nenhum lead novo para importar.')
    } else {
      console.log(`🔥 [INFO] ${newLeads.length} leads novos encontrados. Importando...`)
      for (const lead of newLeads) {
        await importSingleLead(lead)
      }
    }
  } catch (err) {
    console.error('❌ [ERRO CRÍTICO] Ocorreu um erro inesperado no ciclo de processamento:', err.message)
  }

  isProcessing = false
  console.log(`🏁 [INFO] Ciclo de sincronização finalizado.`)
}

/**
 * Processa um único lead, criando contato, oportunidade e salvando o estado.
 */
async function importSingleLead(lead) {
    try {
      console.log(`   -> [PROCESSANDO] Lead ID: ${lead.id} | Nome: ${lead.Nome}`)
      const contactId = await getOrCreateContactId(lead)
      await createOpportunity(contactId, lead)
      
      saveProcessedLeadId(lead.id) // Salva o ID apenas após o sucesso total
      console.log(`   ✅ [SUCESSO] Lead ${lead.Nome} (Contato ID: ${contactId}) importado.`)

    } catch (err) {
      const status = err.response?.status || 'Erro Desconhecido'
      const msg = JSON.stringify(err.response?.data || err.message)
      console.error(`   ❌ [FALHA] Lead ID: ${lead.id} | Erro: ${status} - ${msg}`)
      if (status === 404) {
          console.error(`   ⚠️ [ALERTA] Verifique se o Pipeline ID (${PIPELINE_ID}) e Stage ID (${STAGE_ID}) estão corretos no GHL.`)
      }
    }
}

/**
 * Inicia o serviço de sincronização.
 */
function run() {
  console.log(`[SERVIÇO] Sincronização de Leads iniciado. Verificando a cada ${SYNC_INTERVAL_MINUTES} minutos.`)
  
  // Garante que o diretório de dados exista
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR)
  }

  processLeads() // Executa uma vez imediatamente
  setInterval(processLeads, SYNC_INTERVAL_MINUTES * 60 * 1000) // E depois no intervalo
}


// ================= API EXTERNA (NaPista) =================

/**
 * Busca leads da API "NaPista" usando o cliente autenticado.
 */
async function fetchLeadsFromNaPistaAPI() {
  try {
    // O endpoint '/leads' é um exemplo. Ajuste para o endpoint real da API NaPista.
    const apiClient = getApiClient();
    const response = await apiClient.get('/leads', {
      // Ex: para buscar apenas leads novos, se a API suportar
      // params: { status: 'new', since: lastSyncDate } 
    });

    if (Array.isArray(response.data)) {
      console.log(`[API NaPista] ${response.data.length} leads encontrados.`);
      return response.data;
    }
    
    // Trata casos onde a API retorna sucesso mas com formato inesperado
    if (response.data && typeof response.data === 'object') {
        const dataKey = Object.keys(response.data).find(k => Array.isArray(response.data[k]));
        if (dataKey) {
            console.log(`[API NaPista] Encontrado array de leads na chave '${dataKey}'.`);
            return response.data[dataKey];
        }
    }

    console.error("[API NaPista] A resposta não é um array e não foi encontrado um array aninhado:", response.data);
    return [];

  } catch (error) {
    const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error('❌ [ERRO] Falha ao buscar leads da API NaPista:', errorMsg);
    
    if (error.message.includes('Token de acesso não encontrado')) {
        console.error('   -> [AÇÃO NECESSÁRIA] Execute o fluxo de autenticação para gerar um token.');
    }
    
    return []; // Retorna array vazio para não parar o serviço em caso de falha
  }
}

// ================= API GHL (GoHighLevel) =================

const apiGHL = axios.create({
  baseURL: 'https://services.leadconnectorhq.com',
  headers: {
    'Authorization': `Bearer ${GHL_API_KEY}`,
    'Version': '2021-07-28',
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})

async function getOrCreateContactId(lead) {
  //... (implementação mantida, já é robusta)
  const { firstName, lastName } = splitName(lead.Nome || '')
  const phone = formatPhone(lead.Telefone)
  const email = lead.Email ? lead.Email.toLowerCase().trim() : undefined

  if (!phone) throw new Error(`Telefone inválido para o lead ID ${lead.id}: ${lead.Telefone}`)

  const payload = {
    locationId: LOCATION_ID,
    firstName,
    lastName,
    phone,
    email,
    customFields: [
      { id: CF_CONTACT.creditStatus, value: lead['Status Crédito'] || '' },
      { id: CF_CONTACT.source, value: 'NaPista' },
      { id: CF_CONTACT.plate, value: lead.Placa || '' },
      { id: CF_CONTACT.vehicle, value: lead.Veículo || '' }
    ]
  }

  try {
    const res = await apiGHL.post('/contacts/', payload)
    return res.data.contact.id
  } catch (err) {
    if (err.response?.status === 400 && err.response?.data?.meta?.contactId) {
      console.log(`   - Contato já existente para ${lead.Nome}. Usando ID: ${err.response.data.meta.contactId}`)
      return err.response.data.meta.contactId
    }
    throw err
  }
}

async function createOpportunity(contactId, lead) {
  //... (implementação mantida)
  const name = `${lead.Nome} - ${lead.Veículo || 'Interesse'}`
  const payload = {
    locationId: LOCATION_ID,
    name: name,
    contactId: contactId,
    pipelineId: PIPELINE_ID,
    pipelineStageId: STAGE_ID,
    status: 'open',
    customFields: [
      { id: CF_OPPORTUNITY.vehicle, value: lead.Veículo || '' },
      { id: CF_OPPORTUNITY.message, value: lead.Mensagem || '' }
    ]
  }
  await apiGHL.post('/opportunities/', payload)
}


// ================= HELPERS E ARMAZENAMENTO LOCAL =================

function loadProcessedLeadIds() {
  try {
    if (fs.existsSync(PROCESSED_LEADS_PATH)) {
      const data = fs.readFileSync(PROCESSED_LEADS_PATH, 'utf-8')
      return new Set(JSON.parse(data))
    }
  } catch (err) {
    console.error('⚠️ [ERRO] Falha ao ler arquivo de leads processados. Começando com um set vazio.', err)
  }
  return new Set()
}

function saveProcessedLeadId(leadId) {
  const processedIds = loadProcessedLeadIds()
  processedIds.add(leadId)
  try {
    fs.writeFileSync(PROCESSED_LEADS_PATH, JSON.stringify([...processedIds]), 'utf-8')
  } catch (err) {
    console.error(`❌ [ERRO CRÍTICO] Não foi possível salvar o ID do lead ${leadId}. Risco de reprocessamento.`, err)
  }
}

function splitName(fullName = '') {
  const parts = fullName.trim().split(/\s+/)
  return { firstName: parts.shift() || '', lastName: parts.join(' ') || '' }
}

function formatPhone(phone) {
  if (!phone) return null
  let clean = phone.replace(/\D/g, '')
  if (clean.length >= 10 && clean.length <= 11) {
    clean = '55' + clean
  }
  return '+' + clean
}


// ================= INICIALIZAÇÃO DO SERVIÇO =================
run()