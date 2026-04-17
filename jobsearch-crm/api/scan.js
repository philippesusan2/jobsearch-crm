import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const SALES_KEYWORDS = [
  'sales director', 'director of sales', 'vp sales', 'vp of sales',
  'vice president sales', 'rvp', 'regional vice president',
  'head of sales', 'country manager', 'general manager france',
  'sales manager', 'account executive', 'enterprise account executive',
  'senior account executive', 'strategic account executive',
  'director sales', 'director, sales', 'sales lead', 'revenue director',
  'chief revenue', 'commercial director', 'sales leader',
  'directeur commercial', 'directeur des ventes', 'responsable commercial',
  'head of revenue', 'regional director', 'area vice president',
  'field sales', 'enterprise sales', 'named account',
];

const GEO_KEYWORDS = [
  'france', 'paris', 'emea', 'europe', 'southern europe',
  'emea south', 'france & benelux', 'france/benelux',
  'western europe', 'iberia', 'dach', 'remote', 'london',
  'amsterdam', 'berlin', 'madrid', 'milan', 'dublin',
  'barcelona', 'munich', 'zurich', 'stockholm', 'international',
  'worldwide', 'global', 'anywhere', 'distributed',
];

const HR_PLATFORMS = {
  greenhouse: {
    detect: (url) => url && (url.includes('greenhouse.io') || url.includes('grnh.se')),
    buildUrl: (slug) => `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`,
    parseJobs: (data, company) => {
      if (!data.jobs) return [];
      return data.jobs
        .filter(j => isRelevantJob(j.title, j.location?.name || ''))
        .map(j => ({
          company_name: company.name,
          title: j.title,
          location: j.location?.name || 'Remote',
          url: j.absolute_url || `https://boards.greenhouse.io/${company.slug}/jobs/${j.id}`,
          level: detectLevel(j.title),
          geo: detectGeo(j.location?.name || ''),
          description: cleanText(j.content || '').slice(0, 400),
          source: 'greenhouse',
          date_posted: j.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          is_new: isRecent(j.updated_at),
          is_active: true
        }));
    }
  },
  lever: {
    detect: (url) => url && url.includes('jobs.lever.co'),
    buildUrl: (slug) => `https://api.lever.co/v0/postings/${slug}?mode=json`,
    parseJobs: (data, company) => {
      if (!Array.isArray(data)) return [];
      return data
        .filter(j => isRelevantJob(j.text, j.categories?.location || ''))
        .map(j => ({
          company_name: company.name,
          title: j.text,
          location: j.categories?.location || j.categories?.team || 'Remote',
          url: j.hostedUrl || `https://jobs.lever.co/${company.slug}/${j.id}`,
          level: detectLevel(j.text),
          geo: detectGeo(j.categories?.location || ''),
          description: cleanText(j.descriptionPlain || j.description || '').slice(0, 400),
          source: 'lever',
          date_posted: j.createdAt ? new Date(j.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          is_new: j.createdAt ? isRecent(new Date(j.createdAt).toISOString()) : false,
          is_active: true
        }));
    }
  },
  ashby: {
    detect: (url) => url && (url.includes('ashbyhq.com') || url.includes('jobs.ashby')),
    buildUrl: (slug) => `https://api.ashbyhq.com/posting-api/job-board/${slug}`,
    parseJobs: (data, company) => {
      const jobs = data.jobs || data.jobPostings || [];
      return jobs
        .filter(j => isRelevantJob(j.title, j.location || ''))
        .map(j => ({
          company_name: company.name,
          title: j.title,
          location: j.location || j.locationName || 'Remote',
          url: j.jobUrl || j.applyUrl || company.careers_url,
          level: detectLevel(j.title),
          geo: detectGeo(j.location || ''),
          description: cleanText(j.descriptionPlain || '').slice(0, 400),
          source: 'ashby',
          date_posted: j.publishedDate?.split('T')[0] || new Date().toISOString().split('T')[0],
          is_new: j.publishedDate ? isRecent(j.publishedDate) : false,
          is_active: true
        }));
    }
  },
};

const COMPANY_SLUGS = {
  'databricks': { platform: 'greenhouse', slug: 'databricks' },
  'snowflake': { platform: 'greenhouse', slug: 'snowflake' },
  'glean': { platform: 'greenhouse', slug: 'glean' },
  'harvey': { platform: 'ashby', slug: 'harvey' },
  'harvey ai': { platform: 'ashby', slug: 'harvey' },
  'sierra': { platform: 'greenhouse', slug: 'sierra' },
  'sierra ai': { platform: 'greenhouse', slug: 'sierra' },
  'gong': { platform: 'greenhouse', slug: 'gong' },
  'apollo.io': { platform: 'greenhouse', slug: 'apolloio' },
  'rippling': { platform: 'greenhouse', slug: 'rippling' },
  'writer': { platform: 'greenhouse', slug: 'writer' },
  'elevenlabs': { platform: 'greenhouse', slug: 'elevenlabs' },
  'workato': { platform: 'greenhouse', slug: 'workato' },
  'fivetran': { platform: 'greenhouse', slug: 'fivetran' },
  'collibra': { platform: 'greenhouse', slug: 'collibra' },
  'airbyte': { platform: 'greenhouse', slug: 'airbyte' },
  'decagon': { platform: 'greenhouse', slug: 'decagon' },
  'cognigy': { platform: 'greenhouse', slug: 'cognigy' },
  'mutiny': { platform: 'greenhouse', slug: 'mutiny' },
  'clay': { platform: 'greenhouse', slug: 'clay' },
  'ironclad': { platform: 'greenhouse', slug: 'ironclad' },
  'wiz': { platform: 'greenhouse', slug: 'wiz' },
  'abnormal security': { platform: 'greenhouse', slug: 'abnormalsecurity' },
  'together ai': { platform: 'greenhouse', slug: 'togetherai' },
  'perplexity ai': { platform: 'greenhouse', slug: 'perplexityai' },
  'perplexity': { platform: 'greenhouse', slug: 'perplexityai' },
  'cohere': { platform: 'greenhouse', slug: 'cohere' },
  'scale ai': { platform: 'greenhouse', slug: 'scaleai' },
  'pinecone': { platform: 'greenhouse', slug: 'pinecone' },
  'weights & biases': { platform: 'greenhouse', slug: 'wandb' },
  'observe.ai': { platform: 'greenhouse', slug: 'observeai' },
  'dialpad': { platform: 'greenhouse', slug: 'dialpad' },
  'cresta': { platform: 'greenhouse', slug: 'cresta' },
  'ada': { platform: 'greenhouse', slug: 'ada' },
  'jasper': { platform: 'greenhouse', slug: 'jasperai' },
  'clari': { platform: 'greenhouse', slug: 'clari' },
  'maven agi': { platform: 'greenhouse', slug: 'mavenagi' },
  'devrev': { platform: 'greenhouse', slug: 'devrev' },
  'contentsquare': { platform: 'greenhouse', slug: 'contentsquare' },
  'personio': { platform: 'greenhouse', slug: 'personio' },
  'nabla': { platform: 'greenhouse', slug: 'nabla' },
  'starburst': { platform: 'greenhouse', slug: 'starburst' },
  'dbt labs': { platform: 'greenhouse', slug: 'dbtlabs' },
  'alation': { platform: 'greenhouse', slug: 'alation' },
  'monte carlo': { platform: 'greenhouse', slug: 'montecarlodata' },
  'hightouch': { platform: 'greenhouse', slug: 'hightouch' },
  'census': { platform: 'greenhouse', slug: 'getcensus' },
  'amplitude': { platform: 'greenhouse', slug: 'amplitude' },
  'sprinklr': { platform: 'greenhouse', slug: 'sprinklr' },
  'deepgram': { platform: 'greenhouse', slug: 'deepgram' },
  'assemblyai': { platform: 'greenhouse', slug: 'assemblyai' },
  'vectara': { platform: 'greenhouse', slug: 'vectara' },
  'hebbia': { platform: 'greenhouse', slug: 'hebbia' },
  'ema': { platform: 'greenhouse', slug: 'ema' },
  'snyk': { platform: 'greenhouse', slug: 'snyk' },
  'elastic': { platform: 'greenhouse', slug: 'elastic' },
  'confluent': { platform: 'greenhouse', slug: 'confluent' },
  'dynatrace': { platform: 'greenhouse', slug: 'dynatrace' },
  'okta': { platform: 'greenhouse', slug: 'okta' },
  'pagerduty': { platform: 'greenhouse', slug: 'pagerduty' },
  'lattice': { platform: 'greenhouse', slug: 'lattice' },
  'chargebee': { platform: 'greenhouse', slug: 'chargebee' },
  'groq': { platform: 'greenhouse', slug: 'groq' },
  'coreweave': { platform: 'greenhouse', slug: 'coreweave' },
  'brex': { platform: 'greenhouse', slug: 'brex' },
  'ramp': { platform: 'greenhouse', slug: 'ramp' },
  'gitlab': { platform: 'greenhouse', slug: 'gitlab' },
  'paddle': { platform: 'greenhouse', slug: 'paddle' },
  'anthropic': { platform: 'lever', slug: 'anthropic' },
  'openai': { platform: 'lever', slug: 'openai' },
  'mistral ai': { platform: 'lever', slug: 'mistralai' },
  'mistral': { platform: 'lever', slug: 'mistralai' },
  'hugging face': { platform: 'lever', slug: 'huggingface' },
  'datadog': { platform: 'lever', slug: 'datadog' },
  'mongodb': { platform: 'lever', slug: 'mongodb' },
  'cloudflare': { platform: 'lever', slug: 'cloudflare' },
  'twilio': { platform: 'lever', slug: 'twilio' },
  'zendesk': { platform: 'lever', slug: 'zendesk' },
  'atlassian': { platform: 'lever', slug: 'atlassian' },
  'hashicorp': { platform: 'lever', slug: 'hashicorp' },
  'qonto': { platform: 'ashby', slug: 'qonto' },
  'leapsome': { platform: 'ashby', slug: 'leapsome' },
  'sana labs': { platform: 'ashby', slug: 'sanalabs' },
};

// ── HELPERS ──
function cleanText(html) {
  if (!html) return '';
  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, ' ');
  // Remove data attributes artifacts like data-pm-slice="11[]"
  text = text.replace(/data-[a-z-]+=["'][^"']*["']/g, '');
  // Remove special chars artifacts
  text = text.replace(/\[[\d\[\]]*\]/g, '');
  // Clean whitespace
  text = text.replace(/\s+/g, ' ').trim();
  // Remove HTML entities
  text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '');
  return text;
}

function isRelevantJob(title, location) {
  if (!title) return false;
  const t = title.toLowerCase();
  const l = (location || '').toLowerCase();
  const hasRole = SALES_KEYWORDS.some(k => t.includes(k));
  // More permissive geo: if location is empty, include it (many remote jobs)
  const hasGeo = l === '' || GEO_KEYWORDS.some(k => l.includes(k));
  return hasRole && hasGeo;
}

function detectLevel(title) {
  const t = (title || '').toLowerCase();
  if (t.includes('vp') || t.includes('vice president') || t.includes('rvp') ||
      t.includes('head of') || t.includes('director') || t.includes('chief') ||
      t.includes('country manager') || t.includes('general manager')) return 'DIR';
  if (t.includes('manager') || t.includes('lead')) return 'MGR';
  return 'AE';
}

function detectGeo(location) {
  const l = (location || '').toLowerCase();
  if (l.includes('france') || l.includes('paris')) return 'FR';
  if (l.includes('remote') || l.includes('anywhere') || l.includes('distributed') || l.includes('worldwide')) return 'REMOTE';
  if (l.includes('europe') || l.includes('emea') || l.includes('london') ||
      l.includes('amsterdam') || l.includes('berlin') || l.includes('madrid')) return 'EU';
  return 'EU';
}

function isRecent(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return (now - d) < 21 * 24 * 60 * 60 * 1000; // 21 days
}

// ── SCAN ──
async function scanCompany(company) {
  const nameKey = company.name.toLowerCase().trim();
  const platformInfo = COMPANY_SLUGS[nameKey];

  if (!platformInfo) {
    if (company.careers_url) {
      for (const [key, platform] of Object.entries(HR_PLATFORMS)) {
        if (platform.detect(company.careers_url)) {
          const urlParts = company.careers_url.split('/');
          const slug = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
          if (slug && platform.buildUrl) {
            const apiUrl = platform.buildUrl(slug);
            if (apiUrl) {
              try {
                const res = await fetch(apiUrl, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(8000) });
                if (res.ok) { const data = await res.json(); return platform.parseJobs(data, { ...company, slug }); }
              } catch(e) {}
            }
          }
        }
      }
    }
    return [];
  }

  const { platform: platformName, slug } = platformInfo;
  const platform = HR_PLATFORMS[platformName];
  if (!platform || !platform.buildUrl) return [];
  const apiUrl = platform.buildUrl(slug);
  if (!apiUrl) return [];

  try {
    const res = await fetch(apiUrl, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'JobSearch-CRM/1.0' },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) return [];
    const data = await res.json();
    return platform.parseJobs(data, { ...company, slug });
  } catch(e) {
    console.log(`Failed ${company.name}: ${e.message}`);
    return [];
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const { count } = await supabase.from('job_offers').select('*', { count: 'exact', head: true }).eq('is_active', true);
    const { data: recent } = await supabase.from('job_offers').select('company_name, title, source, date_posted').eq('is_active', true).order('date_posted', { ascending: false }).limit(5);
    return res.status(200).json({ total_offers: count || 0, recent: recent || [], message: 'Use POST to trigger a scan' });
  }

  if (req.method === 'POST') {
    const { company_ids, limit = 50, segment, funding_tier } = req.body || {};
    let query = supabase.from('companies').select('*');
    if (company_ids?.length) query = query.in('id', company_ids);
    if (segment) query = query.eq('segment', segment);
    if (funding_tier) query = query.eq('funding_tier', funding_tier);
    query = query.limit(limit);

    const { data: companies, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    if (!companies?.length) return res.status(200).json({ message: 'No companies to scan', found: 0 });

    const results = { scanned: 0, found: 0, inserted: 0, errors: [] };
    const BATCH = 5;

    for (let i = 0; i < companies.length; i += BATCH) {
      const batch = companies.slice(i, i + BATCH);
      const batchRes = await Promise.allSettled(batch.map(co => scanCompany(co)));

      for (let j = 0; j < batch.length; j++) {
        results.scanned++;
        const result = batchRes[j];
        if (result.status === 'fulfilled' && result.value.length > 0) {
          results.found += result.value.length;
          for (const offer of result.value) {
            const { data: existing } = await supabase.from('job_offers').select('id').eq('company_name', offer.company_name).eq('title', offer.title).limit(1);
            if (!existing?.length) {
              const { error: ie } = await supabase.from('job_offers').insert([{ ...offer, created_at: new Date().toISOString() }]);
              if (!ie) results.inserted++;
            }
          }
        } else if (result.status === 'rejected') {
          results.errors.push(`${batch[j].name}: ${result.reason}`);
        }
      }
      if (i + BATCH < companies.length) await new Promise(r => setTimeout(r, 400));
    }

    return res.status(200).json({
      success: true, scanned: results.scanned, offers_found: results.found,
      new_offers_inserted: results.inserted,
      errors: results.errors.length > 0 ? results.errors.slice(0, 5) : null,
      message: `Scanned ${results.scanned} companies, found ${results.found} relevant offers, inserted ${results.inserted} new ones`
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
