import axios from 'axios'
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config()

const API_KEY = process.env.GHL_API_KEY
const OPPORTUNITY_ID = 'a6UY7y0LQx8Qnr7842MV'

const api = axios.create({
  baseURL: 'https://services.leadconnectorhq.com',
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    Version: '2021-07-28',
    Accept: 'application/json'
  }
})

async function getOpportunityRaw() {
  const res = await api.get(`/opportunities/${OPPORTUNITY_ID}`)
  return res.data.opportunity
}

function normalizeOpportunity(opportunity) {
  // 🔹 Custom Fields (id → value)
  const customFieldsMap = {}
  if (Array.isArray(opportunity.customFields)) {
    opportunity.customFields.forEach(field => {
      customFieldsMap[field.id] = field.fieldValue
    })
  }

  return {
    // 🔹 IDENTIDADE
    id: opportunity.id,
    locationId: opportunity.locationId,
    contactId: opportunity.contactId,

    // 🔹 OPORTUNIDADE
    name: opportunity.name,
    monetaryValue: opportunity.monetaryValue,
    status: opportunity.status,
    source: opportunity.source,

    // 🔹 PIPELINE
    pipeline: {
      pipelineId: opportunity.pipelineId,
      pipelineStageId: opportunity.pipelineStageId,
      assignedTo: opportunity.assignedTo
    },

    // 🔹 CONTATO EMBUTIDO
    contact: opportunity.contact
      ? {
          id: opportunity.contact.id,
          name: opportunity.contact.name,
          email: opportunity.contact.email,
          phone: opportunity.contact.phone,
          companyName: opportunity.contact.companyName,
          tags: opportunity.contact.tags || []
        }
      : null,

    // 🔹 CUSTOM FIELDS
    customFieldsRaw: opportunity.customFields || [],
    customFieldsMap,

    // 🔹 INTERAÇÕES
    notes: opportunity.notes || [],
    tasks: opportunity.tasks || [],
    calendarEvents: opportunity.calendarEvents || [],

    // 🔹 FOLLOWERS
    followers: opportunity.followers || [],

    // 🔹 TIMESTAMPS
    lastStatusChangeAt: opportunity.lastStatusChangeAt,
    lastStageChangeAt: opportunity.lastStageChangeAt,
    lastActionDate: opportunity.lastActionDate,
    createdAt: opportunity.createdAt,
    updatedAt: opportunity.updatedAt,

    // 🔹 METADATA
    indexVersion: opportunity.indexVersion
  }
}

async function run() {
  console.log('🔍 Buscando oportunidade (extração completa)...')

  const rawOpportunity = await getOpportunityRaw()
  const normalized = normalizeOpportunity(rawOpportunity)

  fs.writeFileSync(
    `./opportunity-${OPPORTUNITY_ID}.raw.json`,
    JSON.stringify(rawOpportunity, null, 2)
  )

  fs.writeFileSync(
    `./opportunity-${OPPORTUNITY_ID}.normalized.json`,
    JSON.stringify(normalized, null, 2)
  )

  console.log('✅ Extração concluída')
  console.log('📄 Arquivos gerados:')
  console.log(`- opportunity-${OPPORTUNITY_ID}.raw.json`)
  console.log(`- opportunity-${OPPORTUNITY_ID}.normalized.json`)
}

run().catch(err => {
  console.error('❌ Erro:', err.response?.data || err.message)
})
