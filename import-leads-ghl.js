import fs from 'fs'
import csv from 'csv-parser'
import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

// ================= CONFIG =================
const CSV_PATH = '/Users/raulbehnke/Documents/TopCar/NaPista/data/leads-mugcar.csv'
const LOCATION_ID = process.env.LOCATION_ID

// Verifique se estes IDs existem REALMENTE na URL do seu GHL quando você abre o Pipeline
const PIPELINE_ID = '1d36lApsx8bp3zeIyNak' 
const STAGE_ID = 'ba1b90b4-be01-4b09-b27c-cd0cf764e084'

// ===== CUSTOM FIELDS (IDs devem ser conferidos no settings -> custom fields) =====
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

// ================= API V2 =================
const api = axios.create({
  baseURL: 'https://services.leadconnectorhq.com',
  headers: {
    Authorization: `Bearer ${process.env.GHL_API_KEY}`,
    Version: '2021-07-28',
    'Content-Type': 'application/json',
    Accept: 'application/json'
  }
})

// ================= HELPERS =================
function splitName(fullName = '') {
  const parts = fullName.trim().split(/\s+/)
  return {
    firstName: parts.shift() || '',
    lastName: parts.join(' ') || ''
  }
}

function formatPhone(phone) {
  if (!phone) return null
  let clean = phone.replace(/\D/g, '')
  if (clean.length >= 10 && clean.length <= 11) {
    clean = '55' + clean
  }
  return '+' + clean
}

// ================= LOGIC =================

// 1. Tenta CRIAR. Se existir, recupera o ID do erro.
async function getOrCreateContactId(row) {
  const { firstName, lastName } = splitName(row.Nome || '')
  const phone = formatPhone(row.Telefone)
  const email = row.Email ? row.Email.toLowerCase().trim() : undefined

  if (!phone) throw new Error(`Telefone inválido: ${row.Telefone}`)

  const payload = {
    locationId: LOCATION_ID,
    firstName,
    lastName,
    phone,
    email,
    customFields: [
      { id: CF_CONTACT.creditStatus, value: row['Status Crédito'] || '' },
      { id: CF_CONTACT.source, value: 'NaPista' },
      { id: CF_CONTACT.plate, value: row.Placa || '' },
      { id: CF_CONTACT.vehicle, value: row.Veículo || '' }
    ]
  }

  try {
    // Tenta CRIAR (Documentação: Create Contact)
    const res = await api.post('/contacts/', payload)
    return res.data.contact.id

  } catch (err) {
    // Se der erro 400 e disser que já existe, pegamos o ID retornado na meta
    if (err.response?.status === 400 && err.response?.data?.meta?.contactId) {
        // Opcional: Aqui você poderia fazer um PUT para atualizar dados, se quisesse
        return err.response.data.meta.contactId
    }
    // Se der 400 mas sem ID, ou outro erro
    throw err
  }
}

// 2. Cria a Oportunidade
async function createOpportunity(contactId, row) {
  const name = `${row.Nome} - ${row.Veículo || 'Interesse'}`

  const payload = {
    locationId: LOCATION_ID,
    name: name,
    contactId: contactId,
    pipelineId: PIPELINE_ID,
    pipelineStageId: STAGE_ID,
    status: 'open',
    customFields: [
      { id: CF_OPPORTUNITY.vehicle, value: row.Veículo || '' },
      { id: CF_OPPORTUNITY.message, value: row.Mensagem || '' }
    ]
  }

  // Documentação: Create Opportunity
  await api.post('/opportunities/', payload)
}

// ================= MAIN =================
async function run() {
  const rows = []

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ Arquivo não encontrado: ${CSV_PATH}`)
    return
  }

  console.log('🔄 Iniciando leitura do CSV...')

  fs.createReadStream(CSV_PATH)
    .pipe(csv())
    .on('data', data => rows.push(data))
    .on('end', async () => {
      console.log(`📄 ${rows.length} leads lidos. Processando...\n`)

      let successes = 0
      let failures = 0

      for (const row of rows) {
        let currentStep = 'INÍCIO'
        try {
            // Passo 1: Contato
            currentStep = 'CONTATO'
            const contactId = await getOrCreateContactId(row)

            // Passo 2: Oportunidade
            currentStep = 'OPORTUNIDADE'
            await createOpportunity(contactId, row)

            console.log(`✅ ${row.Nome} (ID: ${contactId}) → Sucesso`)
            successes++

        } catch (err) {
            failures++
            const status = err.response?.status || 'Unknown'
            const msg = JSON.stringify(err.response?.data || err.message)
            
            console.error(`❌ Falha em: ${row.Nome}`)
            console.error(`   Etapa: ${currentStep}`)
            console.error(`   Erro: ${status} - ${msg}`)

            // Diagnóstico específico para o seu erro 404
            if (status === 404 && currentStep === 'OPORTUNIDADE') {
                console.error(`   ⚠️ ALERTA: O Pipeline ID (${PIPELINE_ID}) ou Stage ID (${STAGE_ID}) não foi encontrado na Location. Verifique os IDs.`)
            }
        }
      }

      console.log(`\n🚀 Finalizado. Sucessos: ${successes} | Falhas: ${failures}`)
    })
}

run()