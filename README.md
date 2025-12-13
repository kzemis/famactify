# FamActify AI Provider Switching

This project supports switching AI providers (Lovable or OpenAI ChatGPT) for Supabase Edge Functions.

## Functions using AI
- `supabase/functions/generate-questions/` — generates onboarding/planning questions
- `supabase/functions/generate-recommendations/` — generates day trip activity recommendations

Both functions use a shared utility at `supabase/functions/_lib/ai.ts` to:
- Choose provider via `AI_PROVIDER` env var
- Call the appropriate API
- Normalize responses
- Extract JSON blocks safely

## Environment Variables
Set these in Supabase (Project → Functions → Environment Variables):

- `AI_PROVIDER` — `lovable` (default) or `openai`
- For Lovable:
  - `LOVABLE_API_KEY`
- For OpenAI:
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL` (optional; defaults to `gpt-4o-mini`)
- Supabase service config for recommendations:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

Never expose `SUPABASE_SERVICE_ROLE_KEY` to the frontend. Keep it in server-side env only.

## Deploy Functions
After editing or changing env vars:

```sh
supabase functions deploy generate-questions
supabase functions deploy generate-recommendations
```

## Local Testing (curl)
Questions:
```sh
curl -X POST \
  "https://<your-project-ref>.functions.supabase.co/generate-questions" \
  -H "Content-Type: application/json" \
  -d '{"interests":"outdoors, museums, animals", "maxQuestions":4}'
```

Recommendations:
```sh
curl -X POST \
  "https://<your-project-ref>.functions.supabase.co/generate-recommendations" \
  -H "Content-Type: application/json" \
  -d '{"interests":"Riga, budget-friendly, kids", "answers":{"date":"next Saturday","location":"Riga"}}'
```

## AI Provider Health Check
Deploy the health check function to verify connectivity and model readiness:

```sh
supabase functions deploy ai-health
```

Call it:
```sh
curl -s "https://<your-project-ref>.functions.supabase.co/ai-health" | jq
```

It returns:
```json
{
  "ok": true,
  "provider": "openai",
  "latencyMs": 512
}
```
If `ok` is false, check env vars and provider status.

## Vercel Frontend
For proper OAuth redirects and production URLs:
- Set `VITE_PUBLIC_SITE_URL` to your Vercel domain
- Ensure Supabase Auth "Site URL" and "Redirect URLs" match your domain

## Notes
- Supabase Edge Functions run on Deno; IDE TypeScript may flag imports like `https://deno.land/...` or `Deno.env`. These are correct for runtime.
- The JSON-only contract is enforced; errors from providers are returned with appropriate HTTP status codes.
