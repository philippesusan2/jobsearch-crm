const Anthropic = require('@anthropic-ai/sdk');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { text, existing } = req.body;
    if (!text) return res.status(400).json({ error: 'No text provided' });

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Tu es un assistant qui extrait et normalise des noms de sociétés tech/SaaS/AI.

Voici du texte brut contenant des noms de sociétés :
"""
${text}
"""

Sociétés déjà présentes dans la base (à déduplicer) :
${(existing || []).join(', ')}

Instructions :
1. Extrait TOUS les noms de sociétés du texte
2. Normalise les noms (ex: "mistral ai" → "Mistral AI")
3. Détecte le segment de chaque société : AI_NATIVE, DATA, SAAS, MAJORS, ou UNKNOWN
4. Identifie si la société est déjà présente (doublon) en comparant avec la liste existante
5. Retourne UNIQUEMENT un JSON valide, sans texte avant ou après :
{"companies":[{"name":"Société A","segment":"AI_NATIVE","is_duplicate":false,"note":""},{"name":"Société B","segment":"DATA","is_duplicate":true,"note":"Déjà présente"}]}`
      }]
    });

    const raw = message.content[0].text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(raw);
    return res.status(200).json(parsed);

  } catch (err) {
    console.error('Import error:', err);
    return res.status(500).json({ error: err.message });
  }
};
