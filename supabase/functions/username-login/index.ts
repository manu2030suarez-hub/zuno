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

function readDefaultKey(pluralName: string, legacyName: string): string | null {
  const plural = Deno.env.get(pluralName);
  if (plural) {
    try {
      const keys = JSON.parse(plural);
      if (typeof keys.default === "string" && keys.default) return keys.default;
    } catch {
      console.error(`No se pudo interpretar ${pluralName}.`);
    }
  }
  return Deno.env.get(legacyName) || null;
}

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
    const secretKey = readDefaultKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
    const publishableKey = readDefaultKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");

    if (!supabaseUrl || !secretKey || !publishableKey) {
      console.error("Faltan variables automáticas de Supabase para las claves.");
      return json({ error: "El inicio de sesión por usuario todavía no está configurado." }, 503);
    }

    // Buscar el ID del perfil usando la clave secreta solo desde el servidor.
    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?select=id&username=eq.${encodeURIComponent(normalized)}&limit=1`,
      { headers: { apikey: secretKey, Accept: "application/json" } },
    );
    if (!profileResponse.ok) {
      console.error("Error consultando el perfil:", profileResponse.status);
      return json({ error: "No pudimos validar el usuario. Intentá nuevamente." }, 500);
    }
    const profiles = await profileResponse.json();
    const profileId = profiles?.[0]?.id;
    if (!profileId) {
      return json({ error: "Nombre de usuario o contraseña incorrectos." }, 401);
    }

    // Obtener el correo internamente; nunca se devuelve al navegador.
    const userResponse = await fetch(
      `${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(profileId)}`,
      { headers: { apikey: secretKey } },
    );
    if (!userResponse.ok) {
      console.error("Error consultando la cuenta Auth:", userResponse.status);
      return json({ error: "No pudimos validar el usuario. Intentá nuevamente." }, 500);
    }
    const userData = await userResponse.json();
    const accountEmail = userData?.email;
    if (!accountEmail) {
      return json({ error: "Nombre de usuario o contraseña incorrectos." }, 401);
    }

    // Autenticar con la clave pública; la contraseña nunca se registra.
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: publishableKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: accountEmail, password }),
    });
    const authData = await authResponse.json();

    if (!authResponse.ok || !authData?.access_token || !authData?.refresh_token) {
      return json({
        error: authData?.code === "email_not_confirmed"
          ? "Primero confirmá el correo electrónico de tu cuenta."
          : "Nombre de usuario o contraseña incorrectos.",
      }, 401);
    }

    return json({
      session: {
        access_token: authData.access_token,
        refresh_token: authData.refresh_token,
        token_type: authData.token_type,
        expires_in: authData.expires_in,
        expires_at: authData.expires_at,
        user: authData.user,
      },
    });
  } catch (error) {
    console.error("Error en username-login:", error);
    return json({ error: "No pudimos iniciar sesión. Intentá nuevamente." }, 500);
  }
});
