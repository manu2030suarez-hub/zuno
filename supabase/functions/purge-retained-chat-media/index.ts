// ZUNO · Purga física de archivos cuyo plazo de retención de 90 días terminó.
// Desplegar como Edge Function: purge-retained-chat-media.
// Configurar SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y RETENTION_CRON_SECRET.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const secret = Deno.env.get("RETENTION_CRON_SECRET");
  if (!secret || req.headers.get("x-retention-secret") !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return new Response("Missing server configuration", { status: 500 });

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: rows, error: readError } = await supabase
    .from("retained_chat_messages")
    .select("original_message_id,media_path")
    .lte("retention_until", new Date().toISOString())
    .order("retention_until", { ascending: true })
    .limit(100);

  if (readError) return Response.json({ error: readError.message }, { status: 500 });
  if (!rows?.length) return Response.json({ deleted: 0 });

  const paths = [...new Set(rows.map((row) => row.media_path).filter(Boolean))];
  if (paths.length) {
    const { error: storageError } = await supabase.storage.from("zuno-chat-media").remove(paths);
    if (storageError) return Response.json({ error: storageError.message }, { status: 500 });
  }

  const ids = rows.map((row) => row.original_message_id);
  const { error: deleteError } = await supabase
    .from("retained_chat_messages")
    .delete()
    .in("original_message_id", ids);

  if (deleteError) return Response.json({ error: deleteError.message }, { status: 500 });
  return Response.json({ deleted: ids.length, removed_files: paths.length });
});
