const fetch = require('node-fetch');
require('dotenv').config();

async function check() {
  const TOKEN = process.env.AMOCRM_TOKEN;
  const SUBDOMAIN = process.env.AMOCRM_SUBDOMAIN || 'mulk';
  const res = await fetch(`https://${SUBDOMAIN}.amocrm.ru/api/v4/leads/37405847?with=custom_fields`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  });
  const data = await res.json();
  console.log(JSON.stringify(data.custom_fields_values, null, 2));
}

check().catch(console.error);
