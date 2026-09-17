const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    // 1. Проверяем JWT из заголовка Authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Не авторизован" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Декодируем JWT чтобы получить user_id
    const payload = JSON.parse(atob(token.split(".")[1]));
    const userId = payload.user_id;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Невалидный токен" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Парсим тело запроса
    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return new Response(
        JSON.stringify({ error: "Укажите текущий и новый пароль" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (newPassword.length < 4) {
      return new Response(
        JSON.stringify({ error: "Пароль должен быть минимум 4 символа" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Получаем текущий хеш пароля из БД
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SERVICE_KEY) {
      throw new Error("Missing env vars");
    }

    const dbRes = await fetch(
      `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=password&limit=1`,
      {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const users = await dbRes.json();
    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ error: "Пользователь не найден" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Проверяем текущий пароль
    const currentHash = await hashPassword(currentPassword);
    if (currentHash !== users[0].password) {
      return new Response(
        JSON.stringify({ error: "Неверный текущий пароль" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Хешируем новый пароль и обновляем
    const newHash = await hashPassword(newPassword);
    const updateRes = await fetch(
      `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`,
      {
        method: "PATCH",
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ password: newHash }),
      }
    );

    if (!updateRes.ok) {
      throw new Error("Failed to update password");
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hashBuf)));
}
