import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ── Embedded profiles (no import needed in serverless)
const PROFILES = {
  SENIOR_DIRECTOR: {
    title: 'Senior Sales Director — Enterprise AI · SEMEA',
    cv_label: 'CV Senior Director AI',
    profile: `Philippe Sussan — Senior Sales Director, Enterprise AI
Current: Senior Director SEMEA at C3 AI (NYSE: AI) — Enterprise AI platform, Global 1000, SEMEA.
Previous: Sales Director SEMEA at Seismic (4 years) — Revenue Enablement SaaS, Fortune 500, 5 markets.
Previous: Head of Sales EMEA at Stambia (5 years) — ETL/Data Integration, built EMEA org from scratch.
KEY ACHIEVEMENT: Closed major Enterprise AI platform deal with top-tier European T&L operator — multi-year, pan-European.
DIFFERENTIATORS: C-level selling · GTM design · P&L management · Partner ecosystem (AWS, Microsoft, Accenture, Capgemini) · GDPR/AI Act · EN/FR/ES/IT · Financial Services, Manufacturing, Aero-Defense, T&L, Retail, Pharma.`
  },
  RVP_SALES: {
    title: 'VP Sales · RVP Sales · Revenue Leader',
    cv_label: 'CV RVP Sales',
    profile: `Philippe Sussan — VP Sales / RVP, Enterprise Software
25+ years revenue growth & high-performance team building across Europe for US software/AI leaders.
Current: Senior Director SEMEA at C3 AI. Previous: Sales Director SEMEA Seismic. Previous: Head of Sales EMEA Stambia (built from scratch).
KEY ACHIEVEMENT: Closed major Enterprise AI deal, top-tier European T&L operator, multi-year pan-European.
Built Stambia EMEA sales org from 0: hired RVPs, AEs, BDEs, CSMs, designed OTE/comp, territory, pipeline frameworks.
DIFFERENTIATORS: Revenue/P&L leadership · Team building & coaching · GTM architecture · Complex deal structuring · Alliance management · SEMEA coverage 5 markets · EN/FR/ES/IT.`
  },
  COUNTRY_MANAGER: {
    title: 'Country Manager · General Manager · Managing Director',
    cv_label: 'CV Country Manager',
    profile: `Philippe Sussan — Country Manager / General Manager / Managing Director
25+ years building and running European operations for US software/AI leaders. From greenfield market entry to full subsidiary management with P&L.
Current: Senior Director SEMEA at C3 AI. Previous: Sales Director SEMEA Seismic (5 markets). Previous: Head of Sales EMEA Stambia (launched EMEA from scratch, subsidiary management).
KEY ACHIEVEMENT: Closed major Enterprise AI deal, multi-year pan-European. Built EMEA org from 0 with board-level P&L reporting.
PROFILE BUILDER: Greenfield France/Europe specialist · Full P&L accountability · Subsidiary management · CAC40/ETI C-level network · GDPR/AI Act expertise · EN/FR/ES/IT · Deep European business culture.`
  }
};

function selectProfile(jobTitle, jobLevel, stream) {
  const t = (jobTitle || '').toLowerCase();
  if (stream === 'S2') return PROFILES.COUNTRY_MANAGER;
  if (jobLevel === 'DIR') {
    if (t.includes('rvp') || t.includes('regional vice') || t.includes('vp sales') ||
        t.includes('vp of sales') || t.includes('head of sales') || t.includes('vice president')) {
      return PROFILES.RVP_SALES;
    }
    return PROFILES.SENIOR_DIRECTOR;
  }
  return PROFILES.SENIOR_DIRECTOR;
}

async function callClaude(prompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const data = await response.json();
  return data.content?.map(c => c.text || '').join('') || '';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { offer_id, pipeline_id, stream = 'S1', type = 'email', language = 'fr' } = req.body || {};

  try {
    // ── Get offer details
    let offer = null;
    if (offer_id) {
      const { data } = await supabase.from('job_offers').select('*').eq('id', offer_id).single();
      offer = data;
    }

    // ── Get pipeline entry details
    let pipeline = null;
    if (pipeline_id) {
      const { data } = await supabase.from('pipeline').select('*').eq('id', pipeline_id).single();
      pipeline = data;
    }

    // ── Select the right profile
    const jobTitle = offer?.title || pipeline?.role || '';
    const jobLevel = offer?.level || 'DIR';
    const profile = selectProfile(jobTitle, jobLevel, stream);

    // ── Company info
    const company = offer?.company_name || pipeline?.company_name || '';
    const role = offer?.title || pipeline?.role || '';
    const location = offer?.location || '';
    const description = offer?.description || '';
    const url = offer?.url || '';
    const isProactive = stream === 'S2';

    // ── Generate EMAIL
    let emailPrompt = '';
    if (type === 'email' || type === 'both') {
      if (isProactive) {
        emailPrompt = `You are writing on behalf of Philippe Sussan. Use his profile below to write a highly personalized proactive outreach email IN ENGLISH.

CANDIDATE PROFILE:
${profile.profile}

TARGET COMPANY: ${company}
TARGET ROLE: First Country Manager / VP Sales Europe (no open position — proactive approach)
OBJECTIVE: Propose himself as the ideal person to launch ${company}'s commercial operations in France and/or Europe.

INSTRUCTIONS:
- Direct, confident, non-obsequious — senior executive tone
- Show you know THEIR situation (US company expanding to EU without local commercial leadership)
- Reference their specific product/market/signal if relevant
- Highlight: French/European C-level network, builder profile, GTM experience, GDPR/AI Act angle
- Body: MAX 180 words
- Strong CTA: request 20-minute call

FORMAT:
TO: [First Name Last Name, Title — email@company.com]
SUBJECT: [Max 8 impactful words]

---
[Email body — max 180 words]
---

🎯 STRATEGIC NOTE: [2 sentences on timing/channel/approach to maximize response rate for ${company}]`;
      } else {
        emailPrompt = `You are writing on behalf of Philippe Sussan. Use his profile below to write a highly personalized job application email IN FRENCH.

CANDIDATE PROFILE:
${profile.profile}

POSITION: ${role}
COMPANY: ${company}
LOCATION: ${location}
JOB DESCRIPTION: ${description}

INSTRUCTIONS:
- Professional, impactful — senior executive tone
- Specific hook referencing ${company}'s product/market/recent news
- 2-3 concrete achievements with numbers (from the profile above)
- Emphasize what's most relevant for THIS specific role
- Body: MAX 200 words
- CTA: request 20-minute call

FORMAT:
OBJET: [Max 8 impactful words]

---
[Email body — max 200 words]
---

PS: [1 strategic tip for this specific application]`;
      }
    }

    // ── Generate COVER LETTER
    let coverLetterPrompt = '';
    if (type === 'cover_letter' || type === 'both') {
      coverLetterPrompt = `You are writing on behalf of Philippe Sussan. Write a professional cover letter IN FRENCH for the position below.

CANDIDATE PROFILE:
${profile.profile}

POSITION: ${role}
COMPANY: ${company}
LOCATION: ${location}
JOB DESCRIPTION: ${description}

INSTRUCTIONS:
- Formal cover letter format (Lettre de motivation)
- 3 paragraphs: Opening hook / Why me for this role / Closing CTA
- Max 300 words total
- Reference specific aspects of ${company}'s mission/product
- Highlight 2-3 achievements from profile that match the role requirements
- Professional, confident tone — not generic

FORMAT:
Paris, le [DATE]

[Full letter text — 3 paragraphs]

Cordialement,
Philippe Sussan`;
    }

    // ── Call Claude in parallel if both needed
    let email = '', coverLetter = '';

    if (type === 'both') {
      const [emailResult, clResult] = await Promise.all([
        callClaude(emailPrompt),
        callClaude(coverLetterPrompt)
      ]);
      email = emailResult;
      coverLetter = clResult;
    } else if (type === 'email') {
      email = await callClaude(emailPrompt);
    } else if (type === 'cover_letter') {
      coverLetter = await callClaude(coverLetterPrompt);
    }

    // ── Save to pipeline if pipeline_id provided
    if (pipeline_id && (email || coverLetter)) {
      const updates = { updated_at: new Date().toISOString() };
      if (email) updates.email_body = email;
      if (email) {
        const subjectLine = email.split('\n').find(l => l.startsWith('OBJET:') || l.startsWith('SUBJECT:'));
        if (subjectLine) updates.email_subject = subjectLine.replace(/^(OBJET:|SUBJECT:)\s*/i, '').trim();
      }
      await supabase.from('pipeline').update(updates).eq('id', pipeline_id);
    }

    return res.status(200).json({
      success: true,
      profile_used: profile.cv_label,
      email: email || null,
      cover_letter: coverLetter || null,
      company,
      role,
      is_proactive: isProactive
    });

  } catch (error) {
    console.error('Generate email error:', error);
    return res.status(500).json({ error: error.message });
  }
}
