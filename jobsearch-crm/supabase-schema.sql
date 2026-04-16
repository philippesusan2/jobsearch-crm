-- =====================================================
-- JobSearch CRM — Supabase Schema
-- Colle ce SQL dans Supabase > SQL Editor > New query
-- =====================================================

-- 1. TABLE COMPANIES (base de sociétés TargetRadar)
create table if not exists companies (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  segment text, -- AI_NATIVE, AI_SAAS, DATA, CLOUD, etc.
  subsegment text,
  origin text, -- US, EU, FR, UK, DE...
  founded integer,
  core_business text,
  revenue_m integer, -- en millions USD
  listing text, -- NASDAQ, NYSE, EuroStoxx, Private
  employees text,
  funding_tier text, -- F4=$100M+, F3=$41-100M, F2=$16-40M, F1=$5-15M
  priority text default 'MEDIUM', -- HOT, HIGH, MEDIUM
  geo text default 'FR', -- FR, EMEA
  presence_fr boolean default false,
  what text, -- description courte
  signal text, -- signal Europe
  contact_name text,
  contact_title text,
  careers_url text,
  website text,
  tags text[], -- array de tags
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. TABLE JOB_OFFERS (offres publiées — JobRadar)
create table if not exists job_offers (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references companies(id) on delete set null,
  company_name text not null,
  title text not null,
  location text,
  level text, -- AE, DIR, MGR
  geo text, -- FR, REMOTE, EU
  description text,
  url text not null,
  date_posted date,
  is_new boolean default false,
  is_active boolean default true,
  source text default 'manual', -- manual, greenhouse, lever, microsoft
  created_at timestamptz default now()
);

-- 3. TABLE PIPELINE (suivi candidatures — les deux streams)
create table if not exists pipeline (
  id uuid default gen_random_uuid() primary key,
  stream text not null, -- S1=JobRadar, S2=TargetRadar
  company_id uuid references companies(id) on delete set null,
  company_name text not null,
  offer_id uuid references job_offers(id) on delete set null,
  role text not null,
  contact_name text,
  contact_email text,
  date_added date default current_date,
  email_sent_date date,
  status text default 'À contacter',
  -- statuts: À contacter, Email envoyé, En attente, Réponse +, Réponse -, Entretien, Offre, Refus
  interest integer default 3 check (interest between 1 and 5),
  notes text,
  email_subject text,
  email_body text,
  archived boolean default false,
  archived_date date,
  archived_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. TABLE CV_PROFILES (profils CV sauvegardés)
create table if not exists cv_profiles (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  content text, -- texte extrait du CV
  is_default boolean default false,
  created_at timestamptz default now()
);

-- =====================================================
-- INDEXES pour performance
-- =====================================================
create index if not exists idx_companies_segment on companies(segment);
create index if not exists idx_companies_priority on companies(priority);
create index if not exists idx_companies_listing on companies(listing);
create index if not exists idx_pipeline_stream on pipeline(stream);
create index if not exists idx_pipeline_status on pipeline(status);
create index if not exists idx_pipeline_archived on pipeline(archived);
create index if not exists idx_job_offers_active on job_offers(is_active);

-- =====================================================
-- ROW LEVEL SECURITY — désactivé pour usage solo
-- =====================================================
alter table companies enable row level security;
alter table job_offers enable row level security;
alter table pipeline enable row level security;
alter table cv_profiles enable row level security;

-- Policies open (usage personnel uniquement)
create policy "Allow all on companies" on companies for all using (true) with check (true);
create policy "Allow all on job_offers" on job_offers for all using (true) with check (true);
create policy "Allow all on pipeline" on pipeline for all using (true) with check (true);
create policy "Allow all on cv_profiles" on cv_profiles for all using (true) with check (true);

-- =====================================================
-- DONNÉES INITIALES — Companies (extrait des listes)
-- =====================================================
insert into companies (name, segment, origin, founded, core_business, revenue_m, listing, employees, funding_tier, priority, geo, presence_fr, what, signal, contact_name, careers_url, tags) values

-- AI NATIVE
('OpenAI', 'AI_NATIVE', 'US', 2015, 'LLM / ChatGPT Enterprise', 3700, 'Private', '3 500', 'F4', 'HOT', 'FR', false, 'GPT-4o, o3, ChatGPT Enterprise. $157B.', 'Bureau Europe Dublin sous-staffé. Milliers clients FR sans suivi commercial local.', 'Brad Lightcap COO', 'https://openai.com/careers', ARRAY['LLM','ChatGPT','Enterprise','API']),
('Anthropic', 'AI_NATIVE', 'US', 2021, 'Claude LLM Enterprise', 1000, 'Private', '2 000', 'F4', 'HOT', 'FR', false, 'Claude LLM enterprise. $183B Série F.', 'Fort taux adoption EU sans équipe sales dédiée. AWS/GCP partenaires.', 'Dario Amodei CEO', 'https://www.anthropic.com/careers', ARRAY['Claude','LLM','AI Safety','Enterprise']),
('Mistral AI', 'AI_NATIVE', 'FR', 2023, 'LLM Open-Source Souverain', 50, 'Private', '240', 'F4', 'HOT', 'FR', true, 'LLM open-source souverain. $6B+. HQ Paris.', 'HQ Paris — besoin structurer vente enterprise FR/EU post-Série B.', 'Arthur Mensch CEO', 'https://mistral.ai/fr/careers/', ARRAY['LLM','Souverain','Paris']),
('Perplexity AI', 'AI_NATIVE', 'US', 2022, 'Search IA Génératif', 100, 'Private', '200', 'F4', 'HIGH', 'FR', false, 'Search IA génératif. $9B. 100M+ requêtes/jour.', 'Adoption Europe massive. Zéro présence commerciale locale.', 'Aravind Srinivas CEO', 'https://perplexity.ai/careers', ARRAY['Search AI','Enterprise','B2B']),
('Hugging Face', 'AI_NATIVE', 'FR', 2016, 'ML Platform Open-Source', 0, 'Private', '300', 'F4', 'HIGH', 'FR', true, 'Plateforme ML open-source. HQ Paris + NY. $4.5B.', 'HQ Paris. Expansion commerciale enterprise active.', 'Clément Delangue CEO', 'https://huggingface.co/jobs', ARRAY['ML','Models','Paris']),
('Cohere', 'AI_NATIVE', 'CA', 2019, 'LLM Enterprise RAG', 150, 'Private', '500', 'F4', 'HIGH', 'EMEA', false, 'LLM enterprise (Command, Rerank). Série D.', 'Clients EMEA croissance organique. Aucun commercial Europe local.', 'Aidan Gomez CEO', 'https://cohere.com/careers', ARRAY['LLM','RAG','Enterprise']),

-- AI SAAS
('Glean', 'AI_SAAS', 'US', 2019, 'Enterprise AI Search', 100, 'Private', '600', 'F4', 'HOT', 'FR', false, 'Enterprise AI Search. $4.6B.', 'Expansion Europe explicitement annoncée. Pas de sales France structuré.', 'Arvind Jain CEO', 'https://www.glean.com/careers', ARRAY['AI Search','Knowledge','Enterprise']),
('Harvey AI', 'AI_SAAS', 'US', 2022, 'GenAI Juridique', 50, 'Private', '250', 'F4', 'HOT', 'FR', false, 'GenAI juridique. $8B.', 'Cabinets FR déjà clients. Leadership commercial Europe absent.', 'Winston Weinberg CEO', 'https://harvey.ai/careers', ARRAY['LegalTech','AI','Enterprise']),
('Sierra AI', 'AI_SAAS', 'US', 2023, 'AI Agents CX Enterprise', 30, 'Private', '150', 'F4', 'HOT', 'FR', false, 'Agents IA CX enterprise. $4.5B. Bret Taylor CEO.', 'Expansion enterprise rapide. Sales EMEA à recruter.', 'Bret Taylor CEO', 'https://sierra.ai/careers', ARRAY['AI Agents','CX','Enterprise']),
('Gong', 'AI_SAAS', 'US', 2015, 'Revenue Intelligence IA', 300, 'Private', '1 500', 'F4', 'HIGH', 'FR', true, 'Revenue Intelligence IA. $7.25B.', 'France sous-exploitée vs UK. Fort potentiel grands comptes.', 'Amit Bendov CEO', 'https://www.gong.io/careers/', ARRAY['Revenue AI','Sales Intel']),
('Apollo.io', 'AI_SAAS', 'US', 2015, 'Sales Intelligence IA', 150, 'Private', '500', 'F4', 'HIGH', 'FR', false, 'Sales Intelligence + outreach IA. $1.6B.', 'Explosion adoption EU GTM teams. Zéro commercial local.', 'Tim Zheng CEO', 'https://www.apollo.io/careers', ARRAY['Sales Intel','GTM']),
('Rippling', 'AI_SAAS', 'US', 2016, 'HR/IT/Finance Platform IA', 500, 'Private', '3 000', 'F4', 'HIGH', 'FR', false, 'HR/IT/Finance platform IA. $13.5B.', 'Bureau Dublin + expansion FR annoncée. Leaders locaux à recruter.', 'Parker Conrad CEO', 'https://www.rippling.com/careers', ARRAY['HR','Finance','AI']),
('Writer', 'AI_SAAS', 'US', 2020, 'GenAI Brand Enterprise', 50, 'Private', '200', 'F4', 'HIGH', 'FR', false, 'GenAI brand enterprise. $200M Série C.', 'GTM Europe non structuré. First mover FR/DACH.', 'May Habib CEO', 'https://writer.com/careers/', ARRAY['GenAI','Content']),
('ElevenLabs', 'AI_SAAS', 'US', 2022, 'Voice AI', 80, 'Private', '250', 'F4', 'HIGH', 'FR', false, 'Voice AI leader. $101M Série B.', 'Expansion Europe. Clients media FR. Leadership manquant.', 'Mati Staniszewski CEO', 'https://elevenlabs.io/careers', ARRAY['Voice AI','Media']),

-- AGENTIC
('Workato', 'AGENTIC', 'US', 2013, 'iPaaS + AI Automation', 200, 'Private', '1 500', 'F4', 'HOT', 'FR', false, 'iPaaS + AI automation. $5.7B. Concurrent MuleSoft.', 'Expansion France accélérée. Fit expertise intégration/ETL Susan.', 'Vijay Tella CEO', 'https://www.workato.com/careers', ARRAY['iPaaS','Automation','ETL']),
('Make (Integromat)', 'AGENTIC', 'CZ', 2012, 'Automatisation Visuelle IA', 50, 'Private', '400', 'F3', 'HIGH', 'FR', false, 'Automatisation visuelle + AI. Leader EU iPaaS mid-market.', 'HQ EU. Expansion commerciale France active.', 'Ondřej Gazda CEO', 'https://www.make.com/en/careers', ARRAY['iPaaS','Automation','EU']),

-- DATA AI
('Databricks', 'DATA', 'US', 2013, 'Lakehouse Platform + LLM', 1600, 'Private', '7 000', 'F4', 'HOT', 'FR', true, 'Lakehouse Platform + DBRX LLM. $62B.', 'Croissance EMEA forte. Fit ETL parfait profil Susan.', 'Ali Ghodsi CEO', 'https://www.databricks.com/company/careers', ARRAY['Lakehouse','LLM','Data']),
('Fivetran', 'DATA', 'US', 2012, 'ETL/ELT Automatisé', 300, 'Private', '1 200', 'F4', 'HOT', 'FR', false, 'ETL/ELT automatisé. 500+ connecteurs. $5.6B.', 'CONNEXION DIRECTE : expertise ETL Stambia = argument béton.', 'George Fraser CEO', 'https://www.fivetran.com/careers', ARRAY['ETL','ELT','Data Pipeline']),
('Dataiku', 'DATA', 'FR', 2013, 'MLOps/AI Platform', 200, 'Private', '1 000', 'F4', 'HOT', 'FR', true, 'MLOps/AI enterprise. HQ Paris. $3.7B. Clients CAC40.', 'HQ Paris. Expansion internationale. Fit culturel fort.', 'Florian Douetteau CEO', 'https://www.dataiku.com/company/careers/', ARRAY['MLOps','AI Platform','Paris']),
('Snowflake', 'DATA', 'US', 2012, 'Data Cloud + Cortex AI', 3600, 'NASDAQ', '6 800', 'F4', 'HIGH', 'FR', true, 'Data Cloud + Cortex AI. $55B.', 'France sous-pénétrée vs UK/DE. Co-fondateur français.', 'Benoit Dageville Co-founder', 'https://careers.snowflake.com', ARRAY['Data Cloud','AI','Cortex']),
('Collibra', 'DATA', 'BE', 2008, 'Data Intelligence Cloud', 300, 'Private', '2 000', 'F4', 'HIGH', 'FR', false, 'Data Intelligence Cloud. HQ Bruxelles. $5.7B.', 'Expansion France active. Recrutement senior sales annoncé.', 'Felix Van de Maele CEO', 'https://www.collibra.com/us/en/company/careers', ARRAY['Data Governance','Catalog']),
('Airbyte', 'DATA', 'FR', 2020, 'ETL/ELT Open-Source', 0, 'Private', '200', 'F3', 'HIGH', 'FR', false, 'ETL/ELT open-source. Co-fondateur Paris. $215M.', 'Co-fondateur Paris. Concurrent Fivetran. Expansion enterprise.', 'Michel Tricot CEO', 'https://airbyte.com/careers', ARRAY['ETL','Open Source']),
('Informatica', 'DATA', 'US', 1993, 'ETL/Data Management', 1500, 'NASDAQ', '5 000', 'F4', 'HIGH', 'FR', true, 'ETL/Data Management + CLAIRE AI. Leader historique.', 'Concurrent direct Stambia. Expertise ETL = argument fort.', 'Amit Walia CEO', 'https://www.informatica.com/about-us/careers.html', ARRAY['ETL','Data Management']),

-- CLOUD
('CoreWeave', 'CLOUD', 'US', 2017, 'GPU Cloud IA', 0, 'Private', '1 500', 'F4', 'HIGH', 'EMEA', false, 'GPU cloud IA. IPO 2025. $23B.', 'Datacenters EU en cours. Leaders commerciaux EMEA à recruter.', 'Michael Intrator CEO', 'https://www.coreweave.com/careers', ARRAY['GPU Cloud','AI Compute']),
('Groq', 'CLOUD', 'US', 2016, 'AI Inference Ultra-Rapide', 0, 'Private', '300', 'F4', 'HIGH', 'EMEA', false, 'AI inference ultra-rapide (LPU). $640M Série D.', 'Standard inférence IA. Expansion EU annoncée.', 'Jonathan Ross CEO', 'https://groq.com/careers/', ARRAY['AI Inference','LPU']),

-- VERTICAL AI
('Nabla', 'VERTICAL', 'FR', 2018, 'IA Médicale Clinique', 15, 'Private', '150', 'F3', 'HOT', 'FR', true, 'IA médicale documentation clinique. HQ Paris.', 'HQ Paris. Expansion EU. Clients hôpitaux et médecins FR.', 'Alexandre Lebrun CEO', 'https://www.nabla.com/about/careers/', ARRAY['HealthTech','AI','Paris']),
('Harvey AI', 'VERTICAL', 'US', 2022, 'GenAI Legal', 50, 'Private', '250', 'F4', 'HOT', 'FR', false, 'GenAI juridique. $8B. Magic Circle firms.', 'Cabinets FR déjà clients. Leadership commercial Europe absent.', 'Winston Weinberg CEO', 'https://harvey.ai/careers', ARRAY['LegalTech','AI']),

-- NASDAQ
('Microsoft', 'NASDAQ', 'US', 1975, 'Azure AI / Copilot / Dynamics', 211000, 'NASDAQ', '220 000', 'F4', 'HIGH', 'FR', true, 'Azure AI, Copilot, Dynamics 365. $3.5T.', 'Copilot = nouveau cycle commercial massif. Recrutement FR actif.', 'Satya Nadella CEO', 'https://careers.microsoft.com', ARRAY['Azure','Copilot','AI','Cloud']),
('Alphabet/Google', 'NASDAQ', 'US', 1998, 'Google Cloud AI / Gemini', 307000, 'NASDAQ', '180 000', 'F4', 'HIGH', 'FR', true, 'Google Cloud AI, Vertex AI, Gemini. $1.9T.', 'Google Cloud France recrutement très actif.', 'Sundar Pichai CEO', 'https://careers.google.com', ARRAY['Google Cloud','Gemini','AI']),
('Datadog', 'NASDAQ', 'US', 2010, 'Observability + AI Monitoring', 2600, 'NASDAQ', '5 800', 'F4', 'HIGH', 'FR', true, 'Observability + AI monitoring. $40B. Co-fondateurs français.', 'Co-fondateurs français. Recrutement très actif France.', 'Olivier Pomel CEO', 'https://www.datadoghq.com/careers/', ARRAY['Observability','AI']),
('Palantir', 'NASDAQ', 'US', 2003, 'Analytics + AIP Platform', 2800, 'NASDAQ', '3 700', 'F4', 'HIGH', 'FR', true, 'Analytics + AIP Platform. $200B.', 'AIP = offre AI disruptive. Expansion France active.', 'Alex Karp CEO', 'https://www.palantir.com/careers/', ARRAY['Analytics','AIP','Defense']),
('HubSpot', 'NASDAQ', 'US', 2006, 'CRM + Marketing + AI', 2600, 'NASDAQ', '7 400', 'F4', 'HIGH', 'FR', true, 'CRM + Marketing + AI. $25B.', 'AI features = nouveau cycle. Recrutement FR actif.', 'Yamini Rangan CEO', 'https://www.hubspot.com/jobs', ARRAY['CRM','Marketing','AI']),
('Workday', 'NASDAQ', 'US', 2005, 'HCM + Finance + AI', 7200, 'NASDAQ', '18 000', 'F4', 'HIGH', 'FR', true, 'HCM + Finance Cloud + AI. $55B.', 'AI Illuminate = nouveau cycle. Recrutement France actif.', 'Carl Eschenbach CEO', 'https://www.workday.com/en-us/company/careers.html', ARRAY['HCM','Finance','AI']),
('MongoDB', 'NASDAQ', 'US', 2007, 'Database + Vector Search AI', 1700, 'NASDAQ', '5 000', 'F4', 'HIGH', 'FR', true, 'Database + Atlas Vector Search AI. $25B.', 'Atlas Vector = vague AI enterprise. Recrutement France.', 'Dev Ittycheria CEO', 'https://www.mongodb.com/company/careers', ARRAY['Database','Vector Search']),

-- NYSE
('SAP', 'NYSE', 'DE', 1972, 'ERP Cloud + Business AI', 34000, 'NYSE', '105 000', 'F4', 'HIGH', 'FR', true, 'ERP cloud + Business AI. $250B. Leader ERP mondial.', 'Business AI = nouveau cycle. Recrutement commercial France actif.', 'Christian Klein CEO', 'https://jobs.sap.com', ARRAY['ERP','Business AI']),
('Oracle', 'NYSE', 'US', 1977, 'Cloud ERP + Oracle AI', 53000, 'NYSE', '160 000', 'F4', 'HIGH', 'FR', true, 'Cloud ERP + Oracle AI + Database. $400B.', 'OCI forte croissance. Recrutement France actif.', 'Safra Catz CEO', 'https://www.oracle.com/careers/', ARRAY['Cloud ERP','Database','AI']),
('ServiceNow', 'NYSE', 'US', 2004, 'Now Platform + GenAI', 10900, 'NYSE', '22 000', 'F4', 'HIGH', 'FR', true, 'Now Platform + GenAI. $200B. Leader ITSM.', 'Croissance France très forte. Recrutement actif.', 'Bill McDermott CEO', 'https://careers.servicenow.com', ARRAY['ITSM','GenAI','Workflows']),
('IBM', 'NYSE', 'US', 1911, 'Hybrid Cloud + watsonx AI', 61000, 'NYSE', '280 000', 'F4', 'MEDIUM', 'FR', true, 'Hybrid Cloud + watsonx AI. $180B.', 'Recrutement watsonx France actif.', 'Arvind Krishna CEO', 'https://www.ibm.com/employment/', ARRAY['watsonx','AI','Cloud']),

-- EUROSTOXX
('Capgemini', 'EUROSTOXX', 'FR', 1967, 'IT Services + AI + Cloud', 22500, 'EuroStoxx', '350 000', 'F4', 'HIGH', 'FR', true, 'IT services + AI + cloud. $25B. Leader FR.', 'Division AI forte croissance. Clients CAC40.', 'Aiman Ezzat CEO', 'https://www.capgemini.com/fr-fr/carrieres/', ARRAY['IT Services','AI','CAC40']),
('Dassault Systèmes', 'EUROSTOXX', 'FR', 1981, '3DEXPERIENCE + AI Industriel', 5400, 'EuroStoxx', '23 000', 'F4', 'HIGH', 'FR', true, '3DEXPERIENCE + AI industriel. $40B. Leader PLM.', 'Recrutement commercial FR actif. AI industriel = nouvelle offre.', 'Pascal Daloz CEO', 'https://www.3ds.com/fr/carrieres', ARRAY['PLM','AI','Industrial']),
('Qonto', 'EUROSTOXX', 'FR', 2016, 'Neo-Banque B2B + AI', 0, 'Private', '1 500', 'F4', 'HIGH', 'FR', true, 'Neo-banque B2B + AI. $5B. Leader fintech PME EU.', 'HQ Paris. Expansion EU (DE, ES, IT). Sales senior à recruter.', 'Alexandre Prot CEO', 'https://qonto.com/fr/careers', ARRAY['Fintech','PME']),
('Sage Group', 'EUROSTOXX', 'UK', 1981, 'ERP PME + Sage Copilot AI', 2200, 'EuroStoxx', '14 000', 'F4', 'HIGH', 'FR', true, 'ERP PME + Sage Copilot AI. $12B.', 'AI Copilot = nouveau cycle PME. Expansion France.', 'Steve Hare CEO', 'https://www.sage.com/en-gb/company/careers/', ARRAY['ERP','PME','AI Copilot']),
('Alan', 'EUROSTOXX', 'FR', 2016, 'Assurance Santé AI', 0, 'Private', '600', 'F4', 'HIGH', 'FR', true, 'Assurance santé AI. $4B. Expansion EU.', 'Expansion Europe accélérée. Leadership commercial EU.', 'Jean-Charles Samuelian CEO', 'https://alan.com/fr-fr/jobs', ARRAY['InsurTech','AI','Health']),
('Pennylane', 'EUROSTOXX', 'FR', 2020, 'Comptabilité AI PME', 0, 'Private', '500', 'F3', 'HIGH', 'FR', true, 'Comptabilité + finance AI PME. €75M.', 'HQ Paris. Expansion Europe rapide.', 'Arthur Waller CEO', 'https://www.pennylane.com/fr/jobs', ARRAY['Comptabilité','AI','PME'])

on conflict do nothing;

-- =====================================================
-- VERIFICATION
-- =====================================================
select count(*) as total_companies from companies;
select segment, count(*) from companies group by segment order by count desc;
