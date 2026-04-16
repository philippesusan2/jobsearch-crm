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
    // GET — list pipeline entries
    if (method === 'GET') {
      let q = supabase.from('pipeline').select('*');

      if (query.stream && query.stream !== 'ALL') q = q.eq('stream', query.stream);
      if (query.status && query.status !== 'ALL') q = q.eq('status', query.status);
      if (query.archived === 'true') q = q.eq('archived', true);
      else q = q.eq('archived', false);
      if (query.search) q = q.or(`company_name.ilike.%${query.search}%,role.ilike.%${query.search}%`);

      q = q.order('created_at', { ascending: false });

      const { data, error } = await q;
      if (error) throw error;

      // Stats
      const all = await supabase.from('pipeline').select('status, stream').eq('archived', false);
      const stats = {
        total: data.length,
        byStatus: {},
        byStream: { S1: 0, S2: 0 }
      };
      if (all.data) {
        all.data.forEach(r => {
          stats.byStatus[r.status] = (stats.byStatus[r.status] || 0) + 1;
          stats.byStream[r.stream] = (stats.byStream[r.stream] || 0) + 1;
        });
      }

      return res.status(200).json({ pipeline: data, stats });
    }

    // POST — add to pipeline
    if (method === 'POST') {
      const entry = {
        ...body,
        date_added: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      const { data, error } = await supabase.from('pipeline').insert([entry]).select();
      if (error) throw error;
      return res.status(201).json({ entry: data[0] });
    }

    // PUT — update pipeline entry
    if (method === 'PUT') {
      const { id, ...updates } = body;
      updates.updated_at = new Date().toISOString();
      const { data, error } = await supabase.from('pipeline').update(updates).eq('id', id).select();
      if (error) throw error;
      return res.status(200).json({ entry: data[0] });
    }

    // DELETE — archive (soft delete)
    if (method === 'DELETE') {
      const { id } = query;
      const { data, error } = await supabase.from('pipeline').update({
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
    console.error('Pipeline API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
