export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text, existing = [] } = req.body || {};
  if (!text) return res.status(400).json({ error: 'No text provided' });

  const SEGMENT_RULES = [
    { seg: 'AI_NATIVE', kw: ['anthropic','openai','mistral','cohere','hugging face','huggingface','elevenlabs','writer','glean','harvey','sierra','scale ai','ai21','groq','perplexity','stability','midjourney','runway','moonhub','ability.ai','boosted.ai','synthpop','thoughtful ai','hippocratic','anterior','nullify','dropzone','juna','composabl','altera','happyrobot','fleetworks','retell','vapi','deepgram','cartesia','spellbook','norm ai','indemn','reworkd','firsthand','qualified','tezi','otto','mercor','paradigm','radiant security','hebbia'] },
    { seg: 'DATA',      kw: ['databricks','snowflake','fivetran','dbt','monte carlo','alation','dataiku','collibra','atlan','airbyte','hightouch','census','rudderstack','lightdash','metabase','looker','tableau','power bi','mode','hex'] },
    { seg: 'SAAS',      kw: ['gong','clari','salesloft','outreach','chorus','medallia','gainsight','totango','churnzero','hubspot','salesforce','zendesk','intercom','drift','apollo','zoominfo','lusha','cognism','lemlist','qonto','pennylane','alan','payfit','spendesk','swile','leocare','shine'] },
    { seg: 'MAJORS',    kw: ['microsoft','google','amazon','meta','apple','oracle','sap','ibm','adobe','workday','servicenow','veeva','nutanix','palo alto','crowdstrike','datadog','elastic','mongodb','confluent','gitlab','github','atlassian','okta','zscaler','cloudflare','twilio'] },
    { seg: 'CLOUD',     kw: ['nebius','coreweave','groq','cerebras','lambda labs','vast.ai'] },
  ];

  function detectSegment(name) {
    const n = name.toLowerCase();
    for (const rule of SEGMENT_RULES) {
      if (rule.kw.some(k => n.includes(k))) return rule.seg;
    }
    if (/\.ai$/.test(n) || /\bai\b/.test(n)) return 'AI_NATIVE';
    return 'UNKNOWN';
  }

  function normalize(raw) {
    return raw
      .replace(/[★✓✗✦→←↑↓•·–—]/g, '')
      .replace(/\(.*?\)/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/[★*]{1,3}$/g, '')
      .replace(/[,;:.!?]$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function titleCase(s) {
    const BRANDS = { 'openai': 'OpenAI', 'dbt': 'dbt', 'ibm': 'IBM', 'sap': 'SAP' };
    return s.split(' ').map(w => {
      const low = w.toLowerCase();
      if (BRANDS[low]) return BRANDS[low];
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ');
  }

  function extractNames(text) {
    const names = new Set();
    const lines = text.split(/\n/);
    const NOISE = new Set(['the','and','or','for','with','from','by','to','in','on','at','of','a','an','inc','ltd','llc','corp','co','sa','sas','gmbh','data','saas','legal','finance','hr','sales','security','voice']);

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      const mappingMatch = line.match(/^[^:]{1,40}[:\-–]\s*(.+)$/);
      if (mappingMatch) line = mappingMatch[1];
      const parts = line.split(/[,;\/]|\s+and\s+|\s+&\s+/);
      for (const part of parts) {
        const clean = normalize(part);
        if (clean.length < 2 || clean.length > 60) continue;
        if (/^\d+$/.test(clean)) continue;
        if (NOISE.has(clean.toLowerCase())) continue;
        names.add(titleCase(clean));
      }
    }
    return [...names];
  }

  function isDuplicate(name, existing) {
    // Exact match only — no substring matching to avoid false positives
    const n = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const ex of existing) {
      const e = (ex || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (n === e) return ex;
    }
    return null;
  }

  const extracted = extractNames(text);
  const companies = extracted.map(name => {
    const dup = isDuplicate(name, existing);
    return {
      name,
      segment: detectSegment(name),
      is_duplicate: !!dup,
      note: dup ? `Déjà présente comme "${dup}"` : ''
    };
  });

  return res.status(200).json({ companies });
}
