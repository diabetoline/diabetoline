/**
 * GET /api/compose?token=…&id=1b-03 — deschide draftul Gmail (contul alex@curalife.ro, u/2) pentru un email din lista
 * de contactare a partenerilor (`data/outreach.json`, generată local). Doar o scurtătură: nu trimite nimic.
 * ?list=1 → lista id/to/subject.
 */
import { authorized } from "./stats+api";
import list from "../../data/outreach.json";

type Item = { id: string; to: string; subject: string; body: string };
export async function GET(request: Request): Promise<Response> {
  if (!authorized(request)) return Response.json({ ok: false }, { status: 401 });
  const u = new URL(request.url);
  const items = list as Item[];
  if (u.searchParams.get("list")) return Response.json(items.map(({ id, to, subject }) => ({ id, to, subject })));
  const it = items.find((x) => x.id === u.searchParams.get("id"));
  if (!it) return Response.json({ ok: false, reason: "no such id" }, { status: 404 });
  const acct = u.searchParams.get("u") ?? "2";
  const target = `https://mail.google.com/mail/u/${acct}/?view=cm&fs=1&to=${encodeURIComponent(it.to)}&su=${encodeURIComponent(it.subject)}&body=${encodeURIComponent(it.body)}`;
  return Response.redirect(target, 302);
}
