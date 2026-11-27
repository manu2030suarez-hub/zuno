import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido." }, 405);

  try {
    const { username, password } = await req.json();
    const normalized = String(username ?? "").trim().toLowerCase();
    if (!/^[a-z0-9_.]{3,24}$/.test(normalized) || typeof password !== "string" || password.length < 8 || password.length > 256) {
      return json({ error: "Nombre de usuario o contraseña incorrectos." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    if (!supabaseUrl || !serviceKey || !anonKey) {
      console.error("Falta configurar SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY o SUPABASE_ANON_KEY.");
      return json({ error: "El inicio de sesión por usuario todavía no está configurado." }, 503);
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id")
      .eq("username", normalized)
      .maybeSingle();

    if (profileError || !profile?.id) {
      return json({ error: "Nombre de usuario o contraseña incorrectos." }, 401);
    }

    const { data: userData, error: userError } = await admin.auth.admin.getUserById(profile.id);
    const accountEmail = userData?.user?.email;
    if (userError || !accountEmail) {
      return json({ error: "Nombre de usuario o contraseña incorrectos." }, 401);
    }

    const publicClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: authData, error: authError } = await publicClient.auth.signInWithPassword({
      email: accountEmail,
      password,
    });

    if (authError || !authData.session) {
      return json({
        error: authError?.code === "email_not_confirmed"
          ? "Primero confirmá el correo electrónico de tu cuenta."
          : "Nombre de usuario o contraseña incorrectos.",
      }, 401);
    }

    return json({ session: authData.session });
  } catch (error) {
    console.error("Error en username-login:", error);
    return json({ error: "No pudimos iniciar sesión. Intentá nuevamente." }, 500);
  }
});
