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
    // GET — list companies with filters
    if (method === 'GET') {
      let q = supabase.from('companies').select('*');

      if (query.segment && query.segment !== 'ALL') q = q.eq('segment', query.segment);
      if (query.funding_tier && query.funding_tier !== 'ALL') q = q.eq('funding_tier', query.funding_tier);
      if (query.priority && query.priority !== 'ALL') q = q.eq('priority', query.priority);
      if (query.geo && query.geo !== 'ALL') q = q.eq('geo', query.geo);
      if (query.listing) q = q.eq('listing', query.listing);
      if (query.search) q = q.or(`name.ilike.%${query.search}%,what.ilike.%${query.search}%,signal.ilike.%${query.search}%`);
      if (query.presence_fr === 'true') q = q.eq('presence_fr', true);
      if (query.presence_fr === 'false') q = q.eq('presence_fr', false);

      q = q.order('priority', { ascending: false }).order('name');

      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json({ companies: data, total: data.length });
    }

    // POST — create company
    if (method === 'POST') {
      const { data, error } = await supabase.from('companies').insert([body]).select();
      if (error) throw error;
      return res.status(201).json({ company: data[0] });
    }

    // PUT — update company
    if (method === 'PUT') {
      const { id, ...updates } = body;
      updates.updated_at = new Date().toISOString();
      const { data, error } = await supabase.from('companies').update(updates).eq('id', id).select();
      if (error) throw error;
      return res.status(200).json({ company: data[0] });
    }

    // DELETE — delete company
    if (method === 'DELETE') {
      const { id } = query;
      const { error } = await supabase.from('companies').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Companies API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
