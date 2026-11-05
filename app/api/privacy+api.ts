/**
 * GET /api/privacy — politica de confidențialitate a aplicației, ca pagină HTML publică (cerută de Google Play și App Store).
 * Textul e în src/server/privacy.html; aceeași pagină va fi și pe diabetoline.com când tema permite.
 */
import { PRIVACY_HTML as privacy } from "../../src/server/privacy";

const CSS = `body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:820px;margin:0 auto;padding:24px 18px;color:#14202b;line-height:1.55;font-size:17px}h1{font-size:28px;color:#2C663A}h2{font-size:21px;margin-top:32px;color:#2C663A}table{border-collapse:collapse;width:100%;font-size:15px;margin:12px 0}th,td{border:1px solid #d6dee5;padding:8px;vertical-align:top;text-align:left}th{background:#eef5f0}a{color:#2C663A}hr{margin:36px 0;border:0;border-top:1px solid #d6dee5}`;

export function GET(): Response {
  const html = `<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Diabetoline – Politica de confidențialitate (aplicația)</title><style>${CSS}</style></head><body><h1>Diabetoline – Politica de confidențialitate (aplicația)</h1>${privacy}</body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
