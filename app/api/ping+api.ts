/** GET /api/ping?token=… — trimite o notificare de test pe telefonul lui Alex (ntfy), ca să verifice că abonarea merge. */
import { authorized } from "./stats+api";
import { testPush } from "../../src/server/alerts";

export async function GET(request: Request): Promise<Response> {
  if (!authorized(request)) return Response.json({ ok: false }, { status: 401 });
  const ok = await testPush();
  return Response.json({ ok }, { headers: { "cache-control": "no-store" } });
}
