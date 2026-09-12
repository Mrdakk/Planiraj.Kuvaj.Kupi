import { draftToRecipe, extractRecipeDraftFromHtml, htmlToPlainText } from './parsePage.ts';

const ALLOWED_UNITS = [
  'g',
  'kg',
  'ml',
  'l',
  'kom',
  'glavica',
  'čen',
  'pakovanje',
  'konzerva',
  'flaša',
  'kašika',
  'kašičica',
] as const;

const RECIPE_JSON_SCHEMA = `{
  "name": "string",
  "description": "string ili prazno",
  "baseServings": number,
  "prepTimeMinutes": number ili null,
  "category": "string ili prazno",
  "emoji": "jedan food emoji koji predstavi jelo",
  "steps": ["korak 1", "korak 2"],
  "notes": "string ili prazno",
  "ingredients": [
    { "rawName": "Crni luk", "quantity": 2, "unit": "glavica", "notes": "" }
  ]
}

Pravila:
- Jezik: srpski.
- unit mora biti tačno jedna od: ${ALLOWED_UNITS.join(', ')}.
- kašika = tbsp, kašičica = tsp, čen = čen belog luka, glavica = glavica luka.
- quantity je broj (decimala je OK, npr. 0.5).
- emoji je tačno jedan pictograph (npr. 🍲), bez teksta.
- Nemoj da izmišljaš sastojke koji nisu u materijalu.
- Ako materijal nema recept, vrati: {"error":"Nije pronađen recept na stranici."}`;

const PARSE_SYSTEM_PROMPT = `Ti si parser recepata za srpsku kuhinju.
Dobijaš JSON-LD nacrt ili običan tekst stranice. NE otvaraj URL.
Vrati SAMO validan JSON, bez markdowna i bez objašnjenja.

JSON šema:
${RECIPE_JSON_SCHEMA}`;

const VISIT_SYSTEM_PROMPT = `Ti si parser recepata za srpsku kuhinju.
Otvori dati URL alatom visit_website i izvuci JEDAN recept.
Vrati SAMO validan JSON, bez markdowna i bez objašnjenja.

JSON šema:
${RECIPE_JSON_SCHEMA}`;

const EMOJI_SYSTEM_PROMPT = `Ti biraš JEDAN food emoji za svaki naziv recepta.
Vrati SAMO validan JSON, bez markdowna i bez objašnjenja.

JSON šema:
{
  "emojis": {
    "tačan naziv recepta": "🍲"
  }
}

Pravila:
- Jedan emoji po nazivu, bez teksta i bez nabrajanja.
- Emoji mora da predstavi jelo (ne tanjir ako postoji bolji izbor).
- Koristi raznolike ikone.
- Ključ mora biti identičan datom nazivu.
- Ako nisi siguran, izaberi najbliži food emoji.`;

const INGREDIENT_EMOJI_SYSTEM_PROMPT = `Ti biraš JEDAN emoji za svaku namirnicu (sastojak), ne za gotovo jelo.
Vrati SAMO validan JSON, bez markdowna i bez objašnjenja.

JSON šema:
{
  "emojis": {
    "tačan naziv namirnice": "🧄"
  }
}

Pravila:
- Jedan emoji po nazivu, bez teksta i bez nabrajanja.
- Emoji mora da predstavi tu namirnicu.
- beli luk = 🧄, crni luk = 🧅.
- aleva paprika / mljevena paprika = 🌶️, sveža paprika = 🫑.
- mleveno meso = 🥩, slanina = 🥓.
- Ključ mora biti identičan datom nazivu.
- Ako nisi siguran, izaberi najbliži grocery emoji.`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function extractJson(text: string): Record<string, unknown> {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('Model nije vratio JSON.');
  }
  return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
}

function groqErrorResponse(status: number, message: string) {
  return jsonResponse(
    {
      error: status === 429 ? 'Dnevni besplatni limit Groq-a je popunjen. Pokušaj sutra.' : message,
    },
    status === 429 ? 429 : 502
  );
}

async function groqChat(
  groqKey: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; status: number; content: string; errorMessage: string }> {
  const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqKey}`,
      'Content-Type': 'application/json',
      'Groq-Model-Version': 'latest',
    },
    body: JSON.stringify(body),
  });

  const groqBody = (await groqResponse.json()) as {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
  };

  return {
    ok: groqResponse.ok,
    status: groqResponse.status,
    content: groqBody.choices?.[0]?.message?.content?.trim() ?? '',
    errorMessage: groqBody.error?.message ?? 'Groq nije uspeo.',
  };
}

async function handleEmojiBatch(
  groqKey: string,
  systemPrompt: string,
  userContent: string
) {
  const groq = await groqChat(groqKey, {
    model: 'openai/gpt-oss-20b',
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
  });

  if (!groq.ok) {
    return groqErrorResponse(groq.status, groq.errorMessage);
  }
  if (!groq.content) {
    return jsonResponse({ error: 'Groq nije vratio ikone.' }, 502);
  }

  let payload: Record<string, unknown>;
  try {
    payload = extractJson(groq.content);
  } catch {
    return jsonResponse({ error: 'Groq nije vratio ikone u očekivanom formatu.' }, 422);
  }

  const raw =
    payload.emojis && typeof payload.emojis === 'object'
      ? (payload.emojis as Record<string, unknown>)
      : payload;
  const emojis: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string' && value.trim()) {
      emojis[key] = value.trim();
    }
  }

  return jsonResponse({ emojis });
}

function isCompleteRecipe(recipe: Record<string, unknown>): boolean {
  if (typeof recipe.error === 'string') return false;
  const name = typeof recipe.name === 'string' && recipe.name.trim();
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  return Boolean(name && ingredients.length > 0);
}

function recipeFromGroq(content: string): Record<string, unknown> | null {
  try {
    const recipe = extractJson(content);
    return isCompleteRecipe(recipe) ? recipe : null;
  } catch {
    return null;
  }
}

async function groqParseMaterial(groqKey: string, material: string) {
  return groqChat(groqKey, {
    model: 'openai/gpt-oss-20b',
    temperature: 0.1,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: PARSE_SYSTEM_PROMPT },
      { role: 'user', content: material.slice(0, 14000) },
    ],
  });
}

async function groqVisitWebsite(groqKey: string, url: string) {
  return groqChat(groqKey, {
    model: 'groq/compound-mini',
    temperature: 0.1,
    messages: [
      { role: 'system', content: VISIT_SYSTEM_PROMPT },
      { role: 'user', content: `Otvori ovaj link i izvuci recept: ${url}` },
    ],
    compound_custom: {
      tools: {
        enabled_tools: ['visit_website'],
      },
    },
  });
}

async function fetchRecipePage(url: string): Promise<{ ok: true; html: string } | { ok: false; status: number }> {
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'sr-RS,sr;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });
    if (!response.ok) return { ok: false, status: response.status };
    const html = await response.text();
    return { ok: true, html: html.slice(0, 1_500_000) };
  } catch {
    return { ok: false, status: 0 };
  }
}

async function handleImportUrl(groqKey: string, url: string) {
  const page = await fetchRecipePage(url);

  if (page.ok) {
    const draft = extractRecipeDraftFromHtml(page.html);
    if (draft) {
      const groq = await groqParseMaterial(
        groqKey,
        `Normalizuj ovaj recept u JSON šemu.\n${JSON.stringify(draft)}`
      );
      if (groq.ok) {
        const parsed = recipeFromGroq(groq.content);
        if (parsed) return jsonResponse({ recipe: parsed });
      } else if (groq.status === 429) {
        return groqErrorResponse(groq.status, groq.errorMessage);
      }
      return jsonResponse({ recipe: draftToRecipe(draft) });
    }

    const text = htmlToPlainText(page.html);
    if (text.length > 80) {
      const groq = await groqParseMaterial(
        groqKey,
        `Izvuci recept sa ove stranice (${url}):\n${text}`
      );
      if (groq.ok) {
        const parsed = recipeFromGroq(groq.content);
        if (parsed) return jsonResponse({ recipe: parsed });
      } else if (groq.status === 429) {
        return groqErrorResponse(groq.status, groq.errorMessage);
      }
    }
  }

  const visited = await groqVisitWebsite(groqKey, url);
  if (!visited.ok) {
    return groqErrorResponse(
      visited.status,
      visited.errorMessage || 'Groq nije uspeo da pročita stranicu.'
    );
  }
  if (!visited.content) {
    return jsonResponse({ error: 'Groq nije vratio sadržaj recepta.' }, 502);
  }

  const parsed = recipeFromGroq(visited.content);
  if (parsed) return jsonResponse({ recipe: parsed });

  return jsonResponse(
    { error: 'Nije mogao da se pročita recept sa te stranice. Probaj drugi link ili unesi recept ručno.' },
    422
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Koristi POST.' }, 405);
  }

  const groqKey = Deno.env.get('GROQ_API_KEY');
  if (!groqKey) {
    return jsonResponse(
      { error: 'GROQ_API_KEY nije podešen na serveru. Dodaj secret, bez kartice.' },
      503
    );
  }

  let body: { url?: string; names?: unknown; ingredientNames?: unknown };
  try {
    body = (await req.json()) as { url?: string; names?: unknown; ingredientNames?: unknown };
  } catch {
    return jsonResponse({ error: 'Telo zahteva mora biti JSON sa poljem url, names ili ingredientNames.' }, 400);
  }

  const uniqueNames = (value: unknown) =>
    Array.isArray(value)
      ? [...new Set(value.map((name) => String(name ?? '').trim()).filter(Boolean))].slice(0, 40)
      : [];

  const ingredientNames = uniqueNames(body.ingredientNames);
  if (ingredientNames.length > 0) {
    return handleEmojiBatch(
      groqKey,
      INGREDIENT_EMOJI_SYSTEM_PROMPT,
      `Izaberi emoji za ove namirnice:\n${JSON.stringify(ingredientNames)}`
    );
  }

  const names = uniqueNames(body.names);
  if (names.length > 0) {
    return handleEmojiBatch(
      groqKey,
      EMOJI_SYSTEM_PROMPT,
      `Izaberi emoji za ove recepte:\n${JSON.stringify(names)}`
    );
  }

  const url = body.url?.trim() ?? '';
  if (!isHttpUrl(url)) {
    return jsonResponse({ error: 'Unesi ispravan http(s) link ili listu naziva.' }, 400);
  }

  return handleImportUrl(groqKey, url);
});
