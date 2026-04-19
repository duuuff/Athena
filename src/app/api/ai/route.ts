import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { reply: 'Clé API Anthropic non configurée. Ajoutez ANTHROPIC_API_KEY dans votre fichier .env.local pour activer ScriptaAI.' },
      { status: 200 }
    );
  }

  let prompt: string;
  let context: string;
  try {
    const body = await request.json();
    prompt = body.prompt ?? '';
    context = body.context ?? '';
  } catch {
    return NextResponse.json({ reply: 'Requête invalide.' }, { status: 400 });
  }

  if (!prompt.trim()) {
    return NextResponse.json({ reply: 'Message vide.' }, { status: 400 });
  }

  const systemPrompt = `Tu es ScriptaAI, un assistant d'écriture académique intégré dans un éditeur de documents. Tu aides les utilisateurs à améliorer leurs textes académiques (thèses, mémoires, articles scientifiques, rapports techniques).

Tes spécialités :
- Reformulation et amélioration stylistique
- Génération de transitions et de sections manquantes
- Correction grammaticale et syntaxique (français)
- Résumé et structuration de contenu
- Suggestions de références et de plans

Règles :
- Réponds toujours en français sauf si l'utilisateur écrit dans une autre langue
- Sois concis et direct. Si on te demande du texte, fournis-le directement
- Tu peux utiliser le formatage Markdown dans tes réponses (gras, italique, listes)
- Ne mentionne jamais que tu es un LLM ou que tu utilises un modèle de langage
${context ? `\n--- Contenu actuel du document (extrait HTML) ---\n${context.slice(0, 4000)}\n---` : ''}`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Anthropic API error:', res.status, errText);
      return NextResponse.json(
        { reply: `Erreur API (${res.status}). Vérifiez votre clé ANTHROPIC_API_KEY.` },
        { status: 200 }
      );
    }

    const data = await res.json();
    const reply = data.content?.[0]?.text ?? 'Réponse vide reçue.';
    return NextResponse.json({ reply });
  } catch (err) {
    console.error('AI route error:', err);
    return NextResponse.json(
      { reply: 'Impossible de joindre l\'API Anthropic. Vérifiez votre connexion réseau.' },
      { status: 200 }
    );
  }
}
