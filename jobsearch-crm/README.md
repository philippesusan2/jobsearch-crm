# JobSearch CRM — Setup Guide

## Structure
```
jobsearch-crm/
├── api/
│   ├── companies.js    ← API sociétés (TargetRadar)
│   ├── offers.js       ← API offres (JobRadar)
│   ├── pipeline.js     ← API suivi candidatures
│   └── import.js       ← API import CSV
├── public/
│   ├── index.html      ← Hub principal
│   ├── jobradar.html   ← Plateforme Stream 1
│   └── targetradar.html ← Plateforme Stream 2
├── supabase-schema.sql ← Schéma base de données
├── vercel.json         ← Config déploiement
└── package.json
```

## Étape 1 — Supabase (déjà fait ✓)
- URL: https://xqwfelthsexgdqtasfnw.supabase.co
- Anon Key: configurée

### Créer les tables
1. Va sur supabase.com → ton projet → SQL Editor
2. New query → colle le contenu de `supabase-schema.sql`
3. Clique Run

## Étape 2 — GitHub
```bash
# Dans le dossier jobsearch-crm
git init
git add .
git commit -m "Initial commit — JobSearch CRM"
# Crée un repo sur github.com/philippesusan2
git remote add origin https://github.com/philippesusan2/jobsearch-crm.git
git push -u origin main
```

## Étape 3 — Vercel
1. Va sur vercel.com → "Add New Project"
2. Importe ton repo GitHub `jobsearch-crm`
3. Configure les variables d'environnement :
   - `SUPABASE_URL` = `https://xqwfelthsexgdqtasfnw.supabase.co`
   - `SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
4. Clique Deploy

## Étape 4 — Accès
- Hub : `https://jobsearch-crm.vercel.app`
- JobRadar : `https://jobsearch-crm.vercel.app/jobradar`
- TargetRadar : `https://jobsearch-crm.vercel.app/targetradar`

## Import CSV sociétés
Format CSV attendu pour TargetRadar :
```
name,segment,origin,founded,core_business,revenue_m,listing,employees,funding_tier,priority,geo,presence_fr,what,signal,contact_name,careers_url
OpenAI,AI_NATIVE,US,2015,LLM,3700,Private,3500,F4,HOT,FR,false,...
```
