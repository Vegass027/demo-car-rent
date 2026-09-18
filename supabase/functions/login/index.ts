const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    console.log("=== LOGIN START ===");

    // 1. Env vars
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const JWT_SECRET = Deno.env.get("SUPABASE_JWT_SECRET") ?? Deno.env.get("JWT_SECRET");
    console.log("ENV check:", {
      hasUrl: !!SUPABASE_URL,
      hasKey: !!SERVICE_KEY,
      hasSecret: !!JWT_SECRET,
    });

    if (!SUPABASE_URL || !SERVICE_KEY || !JWT_SECRET) {
      throw new Error("Missing env vars");
    }

    // 2. Parse body
    const body = await req.json();
    console.log("Body parsed, login:", body?.login);

    const { login, password } = body;
    if (!login || !password) {
      return new Response(
        JSON.stringify({ error: "login and password required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Fetch user from DB
    console.log("Fetching user from DB...");
    const dbRes = await fetch(
      `${SUPABASE_URL}/rest/v1/users?username=eq.${encodeURIComponent(login)}&select=id,username,password,role&limit=1`,
      {
        headers: {
          "apikey": SERVICE_KEY,
          "Authorization": `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const users = await dbRes.json();
    console.log("DB response status:", dbRes.status, "users count:", users?.length);

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid credentials" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = users[0];

    // 4. Verify password (SHA-256 — без bcrypt)
    console.log("Verifying password...");
    const passwordMatch = await verifyPassword(password, user.password);
    console.log("Password match:", passwordMatch);
    if (!passwordMatch) {
      return new Response(
        JSON.stringify({ error: "Invalid credentials" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Generate JWT
    console.log("Generating JWT...");
    const token = await generateJWT(
      { user_id: user.id, role: "authenticated", app_role: user.role, username: user.username },
      JWT_SECRET
    );
    console.log("JWT generated OK");

    return new Response(
      JSON.stringify({ token, role: user.role, user_id: user.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("=== LOGIN ERROR ===", err?.message, err?.stack);
    return new Response(
      JSON.stringify({ error: "Internal error", detail: err?.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// --- Утилиты (нативный Web Crypto, без зависимостей) ---

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hashBuf)));
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const computed = await hashPassword(password);
  return computed === storedHash;
}

async function generateJWT(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify({
    ...payload,
    iss: "supabase",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8,
  }));

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${header}.${body}`)
  );

  return `${header}.${body}.${base64url(new Uint8Array(sig))}`;
}

function base64url(input: string | Uint8Array): string {
  const str = typeof input === "string"
    ? btoa(unescape(encodeURIComponent(input)))
    : btoa(String.fromCharCode(...input));
  return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
