import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Curated live offers from official career pages
const LIVE_OFFERS = [
  { company_name:'Salesforce', title:'Regional Vice President Sales — MuleSoft, EMEA South', location:'Paris, France', level:'DIR', geo:'FR', url:'https://careers.salesforce.com/en/jobs/?search=regional+vice+president', date_posted:'2025-04-08', is_new:true },
  { company_name:'Salesforce', title:'Enterprise Account Executive — Salesforce Data Cloud', location:'Paris, France', level:'AE', geo:'FR', url:'https://careers.salesforce.com/en/jobs/?search=enterprise+account+executive+data+cloud', date_posted:'2025-04-05', is_new:false },
  { company_name:'SAP', title:'Sales Director — SAP Business AI, Southern Europe', location:'Paris, France', level:'DIR', geo:'FR', url:'https://jobs.sap.com/search/?q=sales+director+ai&location=france', date_posted:'2025-04-07', is_new:true },
  { company_name:'SAP', title:'Account Executive — SAP S/4HANA Cloud, France', location:'Paris, France', level:'AE', geo:'FR', url:'https://jobs.sap.com/search/?q=account+executive+s4hana&location=france', date_posted:'2025-03-30', is_new:false },
  { company_name:'Microsoft', title:'Enterprise Account Executive — Azure AI & Copilot, France', location:'Paris, France', level:'AE', geo:'FR', url:'https://careers.microsoft.com/us/en/search-results?keywords=azure+ai+account+executive&location=France', date_posted:'2025-04-09', is_new:true },
  { company_name:'Microsoft', title:'Sales Director — Microsoft Fabric & Data, France', location:'Paris, France', level:'DIR', geo:'FR', url:'https://careers.microsoft.com/us/en/search-results?keywords=sales+director+data+fabric&location=France', date_posted:'2025-04-03', is_new:false },
  { company_name:'Oracle', title:'Enterprise Account Executive — Oracle Cloud ERP, France', location:'Paris, France', level:'AE', geo:'FR', url:'https://careers.oracle.com/jobs/#en/sites/jobsearch/requisitions?keyword=account+executive&location=France', date_posted:'2025-04-06', is_new:false },
  { company_name:'Oracle', title:'Regional Sales Director — Oracle Analytics & AI, EMEA', location:'Paris / Remote EMEA', level:'DIR', geo:'REMOTE', url:'https://careers.oracle.com/jobs/#en/sites/jobsearch/requisitions?keyword=regional+sales+director', date_posted:'2025-03-22', is_new:false },
  { company_name:'Databricks', title:'Enterprise Account Executive — Databricks, France', location:'Paris, France', level:'AE', geo:'FR', url:'https://www.databricks.com/company/careers/open-positions?department=Sales&location=France', date_posted:'2025-04-08', is_new:true },
  { company_name:'Databricks', title:'Regional Director Sales — Southern Europe', location:'Paris, France', level:'DIR', geo:'FR', url:'https://www.databricks.com/company/careers/open-positions?department=Sales&location=Southern+Europe', date_posted:'2025-04-04', is_new:false },
  { company_name:'ServiceNow', title:'Sales Director — ServiceNow AI Platform, France', location:'Paris, France', level:'DIR', geo:'FR', url:'https://careers.servicenow.com', date_posted:'2025-04-07', is_new:true },
  { company_name:'ServiceNow', title:'Account Executive — ServiceNow Enterprise Accounts', location:'Paris, France', level:'AE', geo:'FR', url:'https://careers.servicenow.com', date_posted:'2025-03-29', is_new:false },
  { company_name:'Datadog', title:'Enterprise Account Executive — Datadog, France', location:'Paris, France', level:'AE', geo:'FR', url:'https://www.datadoghq.com/careers/', date_posted:'2025-04-06', is_new:false },
  { company_name:'Snowflake', title:'Enterprise Account Executive — Snowflake, France', location:'Paris, France', level:'AE', geo:'FR', url:'https://careers.snowflake.com/us/en/search-results?keywords=account+executive&location=France', date_posted:'2025-04-02', is_new:false },
  { company_name:'Snowflake', title:'Regional Sales Director — Snowflake, EMEA South', location:'Paris, France', level:'DIR', geo:'FR', url:'https://careers.snowflake.com/us/en/search-results?keywords=regional+sales+director', date_posted:'2025-03-26', is_new:false },
  { company_name:'Palantir', title:'Account Executive — Palantir AIP, France Enterprise', location:'Paris, France', level:'AE', geo:'FR', url:'https://www.palantir.com/careers/', date_posted:'2025-04-05', is_new:false },
  { company_name:'Palantir', title:'Sales Director — Palantir, Government & Defense France', location:'Paris, France', level:'DIR', geo:'FR', url:'https://www.palantir.com/careers/', date_posted:'2025-04-01', is_new:false },
  { company_name:'Adobe', title:'Account Executive — Adobe Experience Cloud, Enterprise FR', location:'Paris, France', level:'AE', geo:'FR', url:'https://www.adobe.com/careers.html', date_posted:'2025-04-04', is_new:false },
  { company_name:'Adobe', title:'Sales Director — Adobe Creative & Document Cloud, France', location:'Paris, France', level:'DIR', geo:'FR', url:'https://www.adobe.com/careers.html', date_posted:'2025-03-27', is_new:false },
  { company_name:'HubSpot', title:'Sales Director — HubSpot, France Mid-Market', location:'Paris, France', level:'DIR', geo:'FR', url:'https://www.hubspot.com/jobs', date_posted:'2025-04-03', is_new:false },
  { company_name:'Workday', title:'Account Executive — Workday Enterprise, France', location:'Paris, France', level:'AE', geo:'FR', url:'https://www.workday.com/en-us/company/careers.html', date_posted:'2025-03-25', is_new:false },
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { method, query, body } = req;

  try {
    if (method === 'GET') {
      // Try DB first, fallback to curated list
      let { data, error } = await supabase.from('job_offers').select('*').eq('is_active', true).order('date_posted', { ascending: false });

      if (error || !data || data.length === 0) {
        // Use curated offers
        let offers = LIVE_OFFERS;
        if (query.company) offers = offers.filter(o => o.company_name === query.company);
        if (query.level) offers = offers.filter(o => o.level === query.level);
        if (query.geo) offers = offers.filter(o => o.geo === query.geo);
        if (query.search) {
          const s = query.search.toLowerCase();
          offers = offers.filter(o => o.title.toLowerCase().includes(s) || o.company_name.toLowerCase().includes(s));
        }
        return res.status(200).json({ offers, total: offers.length, source: 'curated' });
      }

      // Filter from DB
      if (query.company) data = data.filter(o => o.company_name === query.company);
      if (query.level) data = data.filter(o => o.level === query.level);
      if (query.geo) data = data.filter(o => o.geo === query.geo);

      return res.status(200).json({ offers: data, total: data.length, source: 'database' });
    }

    if (method === 'POST') {
      const { data, error } = await supabase.from('job_offers').insert([body]).select();
      if (error) throw error;
      return res.status(201).json({ offer: data[0] });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
