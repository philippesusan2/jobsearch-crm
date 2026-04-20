const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const PROFILE_SD = "Philippe Sussan - Senior Sales Director, Enterprise AI. " +
  "Current: Senior Director SEMEA at C3 AI (NYSE: AI) - Enterprise AI platform, Global 1000, SEMEA. " +
  "Previous: Sales Director SEMEA at Seismic (4 years) - Revenue Enablement SaaS, Fortune 500, 5 markets. " +
  "Previous: Head of Sales EMEA at Stambia (5 years) - ETL/Data Integration, built EMEA org from scratch. " +
  "KEY ACHIEVEMENT: Closed major Enterprise AI platform deal with top-tier European T&L operator - multi-year, pan-European. " +
  "DIFFERENTIATORS: C-level selling, GTM design, P&L management, Partner ecosystem (AWS Microsoft Accenture Capgemini), GDPR/AI Act, EN/FR/ES/IT, Financial Services Manufacturing Aero-Defense T&L Retail Pharma.";

const PROFILE_RVP = "Philippe Sussan - VP Sales / RVP, Enterprise Software. " +
  "25+ years revenue growth and high-performance team building across Europe for US software/AI leaders. " +
  "Current: Senior Director SEMEA at C3 AI. Previous: Sales Director SEMEA Seismic. Previous: Head of Sales EMEA Stambia (built from scratch). " +
  "KEY ACHIEVEMENT: Closed major Enterprise AI deal, top-tier European T&L operator, multi-year pan-European. " +
  "Built Stambia EMEA sales org from 0: hired RVPs AEs BDEs CSMs, designed OTE/comp, territory, pipeline frameworks. " +
  "DIFFERENTIATORS: Revenue/P&L leadership, Team building and coaching, GTM architecture, Complex deal structuring, Alliance management, SEMEA coverage 5 markets, EN/FR/ES/IT.";

const PROFILE_CM = "Philippe Sussan - Country Manager / General Manager / Managing Director. " +
  "25+ years building and running European operations for US software/AI leaders. Greenfield market entry to full subsidiary management with P&L. " +
  "Current: Senior Director SEMEA at C3 AI. Previous: Sales Director SEMEA Seismic (5 markets). Previous: Head of Sales EMEA Stambia (launched EMEA from scratch, subsidiary management). " +
  "KEY ACHIEVEMENT: Closed major Enterprise AI deal, multi-year pan-European. Built EMEA org from 0 with board-level P&L reporting. " +
  "PROFILE BUILDER: Greenfield France/Europe specialist, Full P&L accountability, Subsidiary management, CAC40/ETI C-level network, GDPR/AI Act expertise, EN/FR/ES/IT, Deep European business culture.";

function selectProfile(jobTitle, jobLevel, stream) {
  if (stream === 'S2') return { key: 'COUNTRY_MANAGER', label: 'CV Country Manager', profile: PROFILE_CM };
  var t = (jobTitle || '').toLowerCase();
  if (jobLevel === 'DIR') {
    if (t.indexOf('rvp') >= 0 || t.indexOf('regional vice') >= 0 || t.indexOf('vp sales') >= 0 ||
        t.indexOf('vp of sales') >= 0 || t.indexOf('head of sales') >= 0 || t.indexOf('vice president') >= 0) {
      return { key: 'RVP_SALES', label: 'CV RVP Sales', profile: PROFILE_RVP };
    }
  }
  return { key: 'SENIOR_DIRECTOR', label: 'CV Senior Director AI', profile: PROFILE_SD };
}

async function callClaude(prompt) {
  var response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  var data = await response.json();
  if (!data.content) return 'Error: ' + JSON.stringify(data);
  return data.content.map(function(c) { return c.text || ''; }).join('');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  var body = req.body || {};
  var offer_id = body.offer_id;
  var pipeline_id = body.pipeline_id;
  var stream = body.stream || 'S1';
  var type = body.type || 'email';

  // ── Mode TargetRadar (S2 proactif sans offer_id) ──────────────────
  var isTargetRadar = stream === 'S2' && !offer_id && body.company_name;

  try {
    var offer = null;
    var pipeline = null;
    var company, role, location, description;

    if (isTargetRadar) {
      // Données directement dans le body (depuis TargetRadar)
      company = body.company_name || '';
      role = 'Country Manager / VP Sales Europe';
      location = 'Europe';
      description = [
        'What they do: ' + (body.company_what || ''),
        'EU Signal: ' + (body.company_signal || ''),
        'Contact: ' + (body.company_contact || 'CEO/CRO'),
        'Funding: ' + (body.company_funding || '$100M+'),
        'Segment: ' + (body.company_segment || 'AI')
      ].join('\n');
    } else {
      // Mode JobRadar classique (avec offer_id / pipeline_id)
      if (offer_id) {
        var offerRes = await supabase.from('job_offers').select('*').eq('id', offer_id).single();
        offer = offerRes.data;
      }
      if (pipeline_id) {
        var pipRes = await supabase.from('pipeline').select('*').eq('id', pipeline_id).single();
        pipeline = pipRes.data;
      }
      company = (offer && offer.company_name) || (pipeline && pipeline.company_name) || '';
      role = (offer && offer.title) || (pipeline && pipeline.role) || '';
      location = (offer && offer.location) || '';
      description = (offer && offer.description) || '';
    }

    var jobTitle = role;
    var jobLevel = (offer && offer.level) || 'DIR';
    var profileData = selectProfile(jobTitle, jobLevel, stream);

    var email = '';
    var coverLetter = '';

    if (type === 'email' || type === 'both') {
      var emailPrompt;
      if (stream === 'S2') {
        // Prompt proactif Country Manager (TargetRadar)
        emailPrompt = "You are writing on behalf of Philippe Sussan. Write a proactive outreach email IN ENGLISH.\n\n" +
          "CANDIDATE PROFILE:\n" + profileData.profile + "\n\n" +
          "TARGET COMPANY: " + company + "\n" +
          "WHAT THEY DO: " + (body.company_what || '') + "\n" +
          "EU EXPANSION SIGNAL: " + (body.company_signal || '') + "\n" +
          "CONTACT TO ADDRESS: " + (body.company_contact || 'CEO/CRO') + "\n" +
          "FUNDING: " + (body.company_funding || '$100M+') + "\n" +
          "SEGMENT: " + (body.company_segment || 'AI') + "\n\n" +
          "RULES:\n" +
          "- Write directly as Philippe (first person)\n" +
          "- Open with a sharp, specific hook about THIS company's EU situation (use the signal above)\n" +
          "- One concrete reference to their product/market position\n" +
          "- Connect Philippe's most relevant experience: built EMEA from scratch at Stambia, 25yr enterprise AI/SaaS, C-level relationships, P&L ownership\n" +
          "- Close with a clear, low-friction CTA: 20-min call\n" +
          "- Tone: confident, direct, peer-to-peer (not applicant tone)\n" +
          "- Length: 150-180 words MAX for the body\n" +
          "- NO generic phrases: 'I am writing to', 'please find attached', 'I would be delighted'\n\n" +
          "FORMAT (respect exactly):\n" +
          "TO: [First Last · Title · email@" + company.toLowerCase().replace(/\s/g,'') + ".com]\n" +
          "SUBJECT: [Max 8 words, punchy]\n\n" +
          "---\n" +
          "[Email body - max 180 words]\n" +
          "---\n\n" +
          "TIMING ADVICE: [1 sentence on best moment/channel to maximize response rate for " + company + "]";
      } else {
        // Prompt candidature classique (JobRadar)
        emailPrompt = "You are writing on behalf of Philippe Sussan. Write a job application email IN FRENCH.\n\n" +
          "CANDIDATE PROFILE:\n" + profileData.profile + "\n\n" +
          "POSITION: " + role + "\n" +
          "COMPANY: " + company + "\n" +
          "LOCATION: " + location + "\n" +
          "JOB DESCRIPTION: " + description + "\n\n" +
          "INSTRUCTIONS:\n" +
          "- Professional, impactful - senior executive tone\n" +
          "- Specific hook referencing " + company + " product/market\n" +
          "- 2-3 concrete achievements with numbers from the profile\n" +
          "- Emphasize what is most relevant for THIS specific role\n" +
          "- Body: MAX 200 words\n" +
          "- CTA: request 20-minute call\n\n" +
          "FORMAT:\n" +
          "OBJET: [Max 8 impactful words]\n\n" +
          "---\n" +
          "[Email body - max 200 words]\n" +
          "---\n\n" +
          "PS: [1 strategic tip for this application]";
      }
      email = await callClaude(emailPrompt);
    }

    if (type === 'cover_letter' || type === 'both') {
      var clPrompt = "You are writing on behalf of Philippe Sussan. Write a cover letter IN FRENCH.\n\n" +
        "CANDIDATE PROFILE:\n" + profileData.profile + "\n\n" +
        "POSITION: " + role + "\n" +
        "COMPANY: " + company + "\n" +
        "LOCATION: " + location + "\n" +
        "JOB DESCRIPTION: " + description + "\n\n" +
        "INSTRUCTIONS:\n" +
        "- Formal cover letter (Lettre de motivation)\n" +
        "- 3 paragraphs: Opening hook / Why me for this role / Closing CTA\n" +
        "- Max 300 words total\n" +
        "- Reference specific aspects of " + company + " mission/product\n" +
        "- Highlight 2-3 achievements matching role requirements\n" +
        "- Professional, confident tone\n\n" +
        "FORMAT:\n" +
        "Paris, le [DATE]\n\n" +
        "[Full letter - 3 paragraphs]\n\n" +
        "Cordialement,\n" +
        "Philippe Sussan\n" +
        "philippesussan2@gmail.com | +33 6 45 42 22 69";
      coverLetter = await callClaude(clPrompt);
    }

    if (pipeline_id && email) {
      var updates = { updated_at: new Date().toISOString(), email_body: email };
      var lines = email.split('\n');
      var subjectLine = lines.find(function(l) { return l.indexOf('OBJET:') === 0 || l.indexOf('SUBJECT:') === 0; });
      if (subjectLine) {
        updates.email_subject = subjectLine.replace(/^(OBJET:|SUBJECT:)\s*/i, '').trim();
      }
      await supabase.from('pipeline').update(updates).eq('id', pipeline_id);
    }

    return res.status(200).json({
      success: true,
      profile_used: profileData.label,
      email: email || null,
      cover_letter: coverLetter || null,
      company: company,
      role: role,
      is_proactive: stream === 'S2'
    });

  } catch (error) {
    console.error('Generate email error:', error);
    return res.status(500).json({ error: error.message });
  }
};
