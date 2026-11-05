import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { ensureUser, supabase } from "./client";
import type { Lang } from "../i18n";

const API = process.env.EXPO_PUBLIC_API_URL || "https://curalife.expo.app";
export type Msg = { id: string; link_id: string; sender: "parent" | "child"; body: string; created_at: string; read_at: string | null };

/** Părintele: token-ul de push pe toate legăturile lui, ca să primească mesajele copiilor. */
export async function registerParentPush(linkIds: string[], lang: Lang): Promise<boolean> {
  try {
    if (!linkIds.length) return false;
    const perm = await Notifications.getPermissionsAsync();
    const granted = perm.granted || (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return false;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    await ensureUser();
    const { error } = await supabase().from("links").update({ parent_push_token: token, parent_lang: lang }).in("id", linkIds);
    return !error;
  } catch { return false; }
}

export async function fetchMessages(linkId: string, limit = 20): Promise<Msg[]> {
  await ensureUser();
  const { data, error } = await supabase().from("messages").select("id,link_id,sender,body,created_at,read_at").eq("link_id", linkId).order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return ((data ?? []) as Msg[]).reverse();
}

/** Ultimele mesaje necitite primite de mine, pe toate legăturile date (pentru cardul de pe prima pagină). */
export async function fetchUnread(linkIds: string[], me: "parent" | "child"): Promise<Msg[]> {
  if (!linkIds.length) return [];
  await ensureUser();
  const { data, error } = await supabase().from("messages").select("id,link_id,sender,body,created_at,read_at").in("link_id", linkIds).neq("sender", me).is("read_at", null).order("created_at", { ascending: false }).limit(5);
  if (error) throw error;
  return (data ?? []) as Msg[];
}

export async function markRead(ids: string[]) {
  if (!ids.length) return;
  await supabase().from("messages").update({ read_at: new Date().toISOString() }).in("id", ids);
}

/** Scrie mesajul (RLS verifică rolul), apoi cere serverului să trimită push celuilalt. */
export async function sendMessage(linkId: string, sender: "parent" | "child", body: string, from: string): Promise<void> {
  await ensureUser();
  const text = body.trim().slice(0, 200);
  if (!text) return;
  const { error } = await supabase().from("messages").insert({ link_id: linkId, sender, body: text });
  if (error) throw error;
  const { data } = await supabase().auth.getSession();
  const token = data.session?.access_token; if (!token) return;
  try { await fetch(`${API}/api/message`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, linkId, body: text, from }) }); } catch {}
}
