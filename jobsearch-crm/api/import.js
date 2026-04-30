export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text, existing = [] } = req.body || {};
  if (!text) return res.status(400).json({ error: 'No text provided' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY manquante' });

  const prompt = `Tu es un assistant qui extrait et normalise des noms de sociétés tech/SaaS/AI.

Voici du texte brut contenant des noms de sociétés :
"""
${text}
"""

Sociétés déjà présentes dans la base (à déduplicer) :
${existing.join(', ')}

Instructions :
1. Extrait TOUS les noms de sociétés du texte
2. Normalise les noms (ex: "mistral ai" → "Mistral AI")
3. Détecte le segment : AI_NATIVE, DATA, SAAS, MAJORS, ou UNKNOWN
4. Identifie si la société est déjà présente (doublon)
5. Retourne UNIQUEMENT un JSON valide, sans markdown, sans texte avant ou après :
{"companies":[{"name":"Société A","segment":"AI_NATIVE","is_duplicate":false,"note":""},{"name":"Société B","segment":"DATA","is_duplicate":true,"note":"Déjà présente"}]}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic error:', response.status, errText);
      return res.status(500).json({ error: 'Anthropic API error: ' + response.status });
    }

    const data = await response.json();
    const raw = data.content[0].text.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error('JSON parse error:', raw);
      return res.status(500).json({ error: 'Réponse IA non parseable: ' + raw.slice(0, 100) });
    }

    return res.status(200).json(parsed);

  } catch (err) {
    console.error('Import handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
