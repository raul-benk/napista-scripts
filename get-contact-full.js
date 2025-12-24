import axios from 'axios'
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config()

const API_KEY = process.env.GHL_API_KEY
const CONTACT_ID = 'lINzfJt8GA1oJbWhQXNu'

const api = axios.create({
  baseURL: 'https://services.leadconnectorhq.com',
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    Version: '2021-07-28',
    Accept: 'application/json'
  }
})

async function getContactRaw() {
  const res = await api.get(`/contacts/${CONTACT_ID}`)
  return res.data.contact
}

function normalizeContact(contact) {
  const customFieldsMap = {}
  if (Array.isArray(contact.customFields)) {
    contact.customFields.forEach(field => {
      customFieldsMap[field.id] = field.value
    })
  }

  return {
    // 🔹 IDENTIDADE
    id: contact.id,
    locationId: contact.locationId,
    businessId: contact.businessId,
    visitorId: contact.visitorId,

    // 🔹 NOME / IDENTIDADE HUMANA
    name: contact.name,
    firstName: contact.firstName,
    lastName: contact.lastName,
    fullNameLowerCase: contact.fullNameLowerCase,

    // 🔹 CONTATO
    email: contact.email,
    emailLowerCase: contact.emailLowerCase,
    phone: contact.phone,
    website: contact.website,

    // 🔹 LOCALIZAÇÃO
    address: {
      address1: contact.address1,
      city: contact.city,
      state: contact.state,
      country: contact.country,
      postalCode: contact.postalCode,
      timezone: contact.timezone
    },

    // 🔹 STATUS / META
    source: contact.source,
    type: contact.type,
    assignedTo: contact.assignedTo,
    keyword: contact.keyword,
    dateOfBirth: contact.dateOfBirth,

    // 🔹 DND
    dnd: contact.dnd,
    dndSettings: contact.dndSettings,

    // 🔹 TAGS
    tags: contact.tags || [],

    // 🔹 CUSTOM FIELDS
    customFieldsRaw: contact.customFields || [],
    customFieldsMap,

    // 🔹 ATRIBUIÇÃO
    attributionSource: contact.attributionSource || null,
    lastAttributionSource: contact.lastAttributionSource || null,

    // 🔹 TIMESTAMPS
    dateAdded: contact.dateAdded,
    dateUpdated: contact.dateUpdated,
    lastActivity: contact.lastActivity,

    // 🔹 CAMPOS MENOS COMUNS (MAS EXISTENTES)
    attachments: contact.attachments,
    ssn: contact.ssn
  }
}

async function run() {
  console.log('🔍 Buscando contato (extração completa)...')

  const rawContact = await getContactRaw()
  const normalized = normalizeContact(rawContact)

  fs.writeFileSync(
    `./contact-${CONTACT_ID}.raw.json`,
    JSON.stringify(rawContact, null, 2)
  )

  fs.writeFileSync(
    `./contact-${CONTACT_ID}.normalized.json`,
    JSON.stringify(normalized, null, 2)
  )

  console.log('✅ Extração concluída')
  console.log(`📄 Arquivos gerados:`)
  console.log(`- contact-${CONTACT_ID}.raw.json`)
  console.log(`- contact-${CONTACT_ID}.normalized.json`)
}

run().catch(err => {
  console.error('❌ Erro:', err.response?.data || err.message)
})
