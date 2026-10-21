// Server-side AI helper. Deploy as a Supabase Edge Function.
// Never expose AI_API_KEY to the browser.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const apiKey = Deno.env.get('AI_API_KEY')
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'AI_API_KEY is not configured on the server. Use the in-app hybrid overlap engine for the prototype.',
      }),
      { status: 501, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
  const body = await req.json()
  const input = `${body.category ?? ''}\n${body.subject ?? ''}\n${body.description ?? ''}`
  const res = await fetch(Deno.env.get('AI_API_URL') ?? 'https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: Deno.env.get('AI_EMBEDDING_MODEL') ?? 'text-embedding-3-small',
      input,
    }),
  })
  const json = await res.json()
  return new Response(JSON.stringify({ ok: true, embedding: json.data?.[0]?.embedding ?? [] }), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
})
