/** GET /api/health — spune dacă serverul are cheia configurată (fără să o dezvăluie). */
export function GET(): Response {
  return Response.json({ ok: true, ai: Boolean(process.env.ANTHROPIC_API_KEY), supabase: Boolean(process.env.SUPABASE_SERVICE_KEY), at: new Date().toISOString() });
}
