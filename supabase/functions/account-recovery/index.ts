import { createClient } from "https://esm.sh/@supabase/supabase-js@2.119.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  ?? (() => {
    const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
    if (!raw) return undefined;
    try { return (JSON.parse(raw) as Record<string, string>).default; } catch { return undefined; }
  })();
const publishableKey = Deno.env.get("SUPABASE_ANON_KEY")
  ?? (() => {
    const raw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
    if (!raw) return undefined;
    try { return (JSON.parse(raw) as Record<string, string>).default; } catch { return undefined; }
  })();

if (!supabaseUrl || !serviceKey || !publishableKey) {
  throw new Error("Missing Supabase account recovery environment");
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });

function requestIp(request: Request): string {
  return request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown";
}

function readString(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

async function authenticatedUser(request: Request) {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length).trim();
  if (!token) return null;

  const userClient = createClient(supabaseUrl!, publishableKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data, error } = await userClient.auth.getUser(token);
  if (error || !data.user) return null;
  return { user: data.user, userClient };
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const body = await request.json() as Record<string, unknown>;
    const action = readString(body.action, 32);

    if (action === "status" || action === "set-pin") {
      const session = await authenticatedUser(request);
      if (!session) return json({ error: "AUTH_REQUIRED" }, 401);

      if (action === "status") {
        const { data, error } = await session.userClient.rpc("has_own_account_recovery_pin");
        if (error) {
          console.error("[account-recovery] PIN status check failed:", error.message);
          return json({ error: "STATUS_UNAVAILABLE" }, 503);
        }
        return json({ hasPin: data === true });
      }

      const pin = readString(body.pin, 6);
      if (!/^\d{6}$/.test(pin)) return json({ error: "INVALID_PIN" }, 400);
      const { error } = await session.userClient.rpc("set_own_account_recovery_pin", { p_pin: pin });
      if (error) {
        console.error("[account-recovery] PIN update failed:", error.message);
        return json({ error: "PIN_UPDATE_FAILED" }, 400);
      }
      return json({ ok: true });
    }

    if (action !== "reset-password") return json({ error: "INVALID_ACTION" }, 400);

    const email = readString(body.email, 254).toLowerCase();
    const pin = readString(body.pin, 6);
    const password = typeof body.password === "string" ? body.password : "";
    const minimumPasswordLength = 8;

    if (!/^\S+@\S+\.\S+$/.test(email) || !/^\d{6}$/.test(pin)
      || password.length < minimumPasswordLength || password.length > 72) {
      return json({ error: "RECOVERY_FAILED" }, 400);
    }

    const { data: userId, error: verifyError } = await admin.rpc("verify_account_recovery_pin", {
      p_email: email,
      p_pin: pin,
      p_ip: requestIp(request),
    });

    if (verifyError) {
      console.error("[account-recovery] PIN verification failed:", verifyError.message);
      return json({ error: "RECOVERY_FAILED" }, 400);
    }
    if (typeof userId !== "string") return json({ error: "RECOVERY_FAILED" }, 400);

    const { data: userData, error: lookupError } = await admin.auth.admin.getUserById(userId);
    const user = userData.user;
    if (lookupError || !user || user.email?.toLowerCase() !== email) {
      console.error("[account-recovery] Account lookup failed after PIN verification");
      return json({ error: "RECOVERY_FAILED" }, 400);
    }
    if (user.banned_until && new Date(user.banned_until).getTime() > Date.now()) {
      return json({ error: "RECOVERY_FAILED" }, 400);
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(userId, { password });
    if (updateError) {
      console.error("[account-recovery] Password update failed:", updateError.message);
      return json({ error: "RECOVERY_FAILED" }, 400);
    }

    return json({ ok: true });
  } catch (error) {
    console.error("[account-recovery] Request failed:", error instanceof Error ? error.message : error);
    return json({ error: "RECOVERY_FAILED" }, 400);
  }
});
