import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.4";

const PROD_ORIGIN = "https://explic-radio.vercel.app";
const TABLE = "explic_radio_chat_messages";

function allowedOrigin(req: Request) {
  const origin = req.headers.get("origin") || "";
  return origin === PROD_ORIGIN || /^https:\/\/explic-radio-[a-z0-9-]+\.vercel\.app$/i.test(origin)
    ? origin
    : PROD_ORIGIN;
}

function cors(req: Request) {
  return {
    "Access-Control-Allow-Origin": allowedOrigin(req),
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Vary": "Origin",
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function secretKey() {
  const modern = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (modern) {
    try {
      const parsed = JSON.parse(modern);
      if (parsed.default) return parsed.default;
      const first = Object.values(parsed)[0];
      if (typeof first === "string") return first;
    } catch {
      // Fall through to the compatible service key.
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
}

const validListener = (value: unknown) =>
  typeof value === "string" && /^[a-zA-Z0-9_-]{16,80}$/.test(value);

function clean(value: unknown, max: number) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, max);
}

function publicMessage(row: Record<string, unknown>) {
  return {
    id: row.id,
    listenerKey: row.listener_key,
    nickname: row.nickname,
    message: row.message,
    createdAt: row.created_at,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const listenerKey = body.listenerKey;
    if (!validListener(listenerKey)) return json(req, { error: "Invalid listener" }, 400);

    const db = createClient(Deno.env.get("SUPABASE_URL")!, secretKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    if (body.action === "load") {
      const result = await db
        .from(TABLE)
        .select("id,listener_key,nickname,message,created_at")
        .order("created_at", { ascending: false })
        .limit(40);
      if (result.error) return json(req, { error: result.error.message }, 400);
      return json(req, { messages: (result.data || []).reverse().map(publicMessage) });
    }

    if (body.action === "send") {
      const nickname = clean(body.nickname, 24);
      const message = clean(body.message, 200);
      if (!nickname) return json(req, { error: "Add a nickname first" }, 400);
      if (!message) return json(req, { error: "Write a message first" }, 400);

      const minuteAgo = new Date(Date.now() - 60_000).toISOString();
      const recent = await db
        .from(TABLE)
        .select("message,created_at")
        .eq("listener_key", listenerKey)
        .gte("created_at", minuteAgo)
        .order("created_at", { ascending: false })
        .limit(9);
      if (recent.error) return json(req, { error: recent.error.message }, 400);
      const rows = recent.data || [];
      const lastAt = rows[0]?.created_at ? Date.parse(rows[0].created_at) : 0;
      if (Date.now() - lastAt < 2_500) return json(req, { error: "Easy—give it a second" }, 429);
      if (rows.length >= 8) return json(req, { error: "Message limit reached. Try again in a minute" }, 429);
      if (rows.some((row) => row.message === message && Date.now() - Date.parse(row.created_at) < 30_000)) {
        return json(req, { error: "That message is already in the room" }, 409);
      }

      const inserted = await db
        .from(TABLE)
        .insert({ listener_key: listenerKey, nickname, message })
        .select("id,listener_key,nickname,message,created_at")
        .single();
      if (inserted.error) return json(req, { error: inserted.error.message }, 400);

      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      await db.from(TABLE).delete().lt("created_at", cutoff);
      return json(req, { message: publicMessage(inserted.data) });
    }

    return json(req, { error: "Unknown action" }, 400);
  } catch (error) {
    return json(req, { error: error instanceof Error ? error.message : "Chat unavailable" }, 500);
  }
});
