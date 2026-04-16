import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { rows, table } = req.body;
    if (!rows || !Array.isArray(rows)) return res.status(400).json({ error: 'rows array required' });

    const target = table || 'companies';
    let inserted = 0, errors = [];

    // Process in batches of 50
    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50).map(row => ({
        ...row,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      const { data, error } = await supabase.from(target).insert(batch);
      if (error) errors.push(error.message);
      else inserted += batch.length;
    }

    return res.status(200).json({
      success: true,
      inserted,
      errors: errors.length > 0 ? errors : null,
      message: `${inserted} entrées importées dans ${target}`
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
