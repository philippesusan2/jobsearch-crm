import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { method, query, body } = req;

  try {
    // GET — list target pipeline entries
    if (method === 'GET') {
      let q = supabase.from('target_pipeline').select('*');
      if (query.status && query.status !== 'ALL') q = q.eq('status', query.status);
      if (query.archived === 'true') q = q.eq('archived', true);
      else q = q.eq('archived', false);
      if (query.search) q = q.ilike('company', `%${query.search}%`);
      q = q.order('created_at', { ascending: false });
      const { data, error } = await q;
      if (error) throw error;

      // Stats
      const all = await supabase.from('target_pipeline').select('status').eq('archived', false);
      const stats = { total: data.length, byStatus: {} };
      if (all.data) {
        all.data.forEach(r => {
          stats.byStatus[r.status] = (stats.byStatus[r.status] || 0) + 1;
        });
      }
      return res.status(200).json({ pipeline: data, stats });
    }

    // POST — add to target pipeline
    if (method === 'POST') {
      const entry = {
        ...body,
        date_added: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        archived: false
      };
      const { data, error } = await supabase.from('target_pipeline').insert([entry]).select();
      if (error) throw error;
      return res.status(201).json({ entry: data[0] });
    }

    // PUT — update entry (status, interest, notes, email_sent)
    if (method === 'PUT') {
      const { id, ...updates } = body;
      updates.updated_at = new Date().toISOString();
      const { data, error } = await supabase.from('target_pipeline').update(updates).eq('id', id).select();
      if (error) throw error;
      return res.status(200).json({ entry: data[0] });
    }

    // DELETE — soft archive
    if (method === 'DELETE') {
      const { id } = query;
      const { data, error } = await supabase.from('target_pipeline').update({
        archived: true,
        archived_date: new Date().toISOString().split('T')[0],
        archived_reason: 'Archivée',
        updated_at: new Date().toISOString()
      }).eq('id', id).select();
      if (error) throw error;
      return res.status(200).json({ entry: data[0] });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Target pipeline API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
