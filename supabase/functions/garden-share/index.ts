import { createClient } from "https://esm.sh/@supabase/supabase-js@2.119.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceKey) {
  throw new Error("Missing Supabase function environment");
}

const db = createClient(supabaseUrl, serviceKey, {
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

const encoder = new TextEncoder();

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return bytesToBase64(new Uint8Array(digest));
}

async function verifyPin(pin: string, secret: {
  pin_salt: string;
  pin_hash: string;
  iterations: number;
}): Promise<boolean> {
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: base64ToBytes(secret.pin_salt),
      iterations: secret.iterations,
      hash: "SHA-256",
    },
    material,
    256,
  );
  const actual = new Uint8Array(derived);
  const expected = base64ToBytes(secret.pin_hash);
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) {
    difference |= actual[index] ^ expected[index];
  }
  return difference === 0;
}

function requestIp(request: Request): string {
  return request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown";
}

async function enforceRateLimit(
  action: "pin" | "guestbook",
  slug: string,
  ip: string,
  limit: number,
  windowMinutes: number,
): Promise<boolean> {
  const requestHash = await sha256(action + ":" + slug + ":" + ip);
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
  const { count, error } = await db
    .from("garden_share_attempts")
    .select("id", { count: "exact", head: true })
    .eq("request_hash", requestHash)
    .eq("action", action)
    .gte("created_at", since);

  if (error) {
    console.error("Rate-limit lookup failed:", error.message);
    return false;
  }
  if ((count ?? 0) >= limit) return false;

  const { error: insertError } = await db
    .from("garden_share_attempts")
    .insert({ request_hash: requestHash, action });

  if (insertError) {
    console.error("Rate-limit record failed:", insertError.message);
    return false;
  }
  return true;
}

async function loadGarden(slug: string) {
  const { data, error } = await db
    .from("gardens")
    .select("id,name,introduction,letter_title,letter_paragraphs,letter_signature,share_slug,is_published,cover_path,experience_settings,guestbook_enabled")
    .eq("share_slug", slug)
    .eq("is_published", true)
    .not("published_at", "is", null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function signedImage(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await db.storage
    .from("garden-photos")
    .createSignedUrl(path, 60 * 60);
  if (error) {
    console.warn("Could not sign garden image:", error.message);
    return null;
  }
  return data.signedUrl;
}

async function verifyGardenAccess(garden: Record<string, unknown>, slug: string, ip: string, pin: string): Promise<Response | null> {
  const { data: secret, error } = await db
    .from("garden_share_secrets")
    .select("pin_salt,pin_hash,iterations")
    .eq("garden_id", String(garden.id))
    .maybeSingle();

  if (error) throw error;
  if (!secret) return null;

  const allowed = await enforceRateLimit("pin", slug, ip, 8, 15);
  if (!allowed) return json({ error: "RATE_LIMITED" }, 429);

  if (!pin || !(await verifyPin(pin, secret))) {
    return json({ error: pin ? "PIN_INVALID" : "PIN_REQUIRED" }, 401);
  }
  return null;
}

async function viewGarden(garden: Record<string, unknown>, pin: string, slug: string, ip: string) {
  const gardenId = String(garden.id);
  const denied = await verifyGardenAccess(garden, slug, ip, pin);
  if (denied) return denied;

  const experienceSettings = garden.experience_settings && typeof garden.experience_settings === "object"
    ? garden.experience_settings as Record<string, unknown>
    : {};
  const rawInlinePhotos = Array.isArray(experienceSettings.inlinePhotos)
    ? experienceSettings.inlinePhotos
    : [];
  const rawInlinePhotoParts = Array.isArray(experienceSettings.inlinePhotoParts)
    ? experienceSettings.inlinePhotoParts
    : [];
  const assembledPhotoUrls = rawInlinePhotoParts
    .slice(0, 5)
    .map((parts) => {
      if (!Array.isArray(parts)) return "";
      const base64 = parts
        .filter((part): part is string => typeof part === "string" && /^[A-Za-z0-9+/=]+$/.test(part))
        .join("");
      return base64 ? "data:image/webp;base64," + base64 : "";
    });
  const inlinePhotoAlts = Array.isArray(experienceSettings.inlinePhotoAlts)
    ? experienceSettings.inlinePhotoAlts
    : [];
  const inlinePhotos = [...rawInlinePhotos, ...assembledPhotoUrls]
    .filter((value): value is string =>
      typeof value === "string"
      && value.length <= 220_000
      && /^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(value)
    )
    .slice(0, 5)
    .map((url, index) => ({
      path: "inline/" + index,
      url,
      alt: typeof inlinePhotoAlts[index] === "string"
        ? inlinePhotoAlts[index] as string
        : "Một kỷ niệm gia đình",
      width: index === 0 ? 720 : 600,
      height: index === 0 ? 540 : 800,
    }));

  const [itemsResult, chaptersResult, albumResult, guestbookResult, storageCoverUrl] = await Promise.all([
    db.from("garden_items")
      .select("id,kind,color,x,depth,size,chapter_id,label,title,sort_order")
      .eq("garden_id", gardenId)
      .order("sort_order", { ascending: true }),
    db.from("garden_chapters")
      .select("chapter_id,sort_order,title,paragraphs")
      .eq("garden_id", gardenId)
      .order("sort_order", { ascending: true }),
    db.storage.from("garden-photos").list(gardenId, {
      limit: 40,
      sortBy: { column: "created_at", order: "desc" },
    }),
    db.from("garden_guestbook")
      .select("id,guest_name,message,created_at")
      .eq("garden_id", gardenId)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(20),
    signedImage(typeof garden.cover_path === "string" ? garden.cover_path : null),
  ]);

  if (itemsResult.error) throw itemsResult.error;
  if (chaptersResult.error) throw chaptersResult.error;
  if (guestbookResult.error) throw guestbookResult.error;

  const files = (albumResult.data ?? []).filter((file) =>
    file.name && file.id && ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"].includes(file.metadata?.mimetype ?? "")
  );

  const storedPhotos = (await Promise.all(files.map(async (file) => {
    const path = gardenId + "/" + file.name;
    const url = await signedImage(path);
    return url ? { path, url, alt: "Khoảnh khắc trong khu vườn" } : null;
  }))).filter((photo) => photo !== null);
  const photos = [...inlinePhotos, ...storedPhotos];
  const coverUrl = storageCoverUrl ?? inlinePhotos[0]?.url ?? null;

  return json({
    garden: {
      id: garden.id,
      name: garden.name,
      introduction: garden.introduction,
      letter_title: garden.letter_title,
      letter_paragraphs: garden.letter_paragraphs,
      letter_signature: garden.letter_signature,
      experience_settings: garden.experience_settings ?? {},
      guestbook_enabled: garden.guestbook_enabled === true,
      cover_url: coverUrl,
    },
    items: itemsResult.data ?? [],
    chapters: chaptersResult.data ?? [],
    photos,
    guestbook: guestbookResult.data ?? [],
  });
}

async function submitGuestbook(garden: Record<string, unknown>, slug: string, ip: string, pin: string, body: Record<string, unknown>) {
  if (garden.guestbook_enabled !== true) return json({ error: "GUESTBOOK_DISABLED" }, 403);
  const denied = await verifyGardenAccess(garden, slug, ip, pin);
  if (denied) return denied;
  if (typeof body.website === "string" && body.website.trim()) return json({ ok: true }, 200);

  const guestName = typeof body.guestName === "string" ? body.guestName.trim().slice(0, 50) : "";
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 1000) : "";
  if (guestName.length < 1 || message.length < 1) return json({ error: "INVALID_MESSAGE" }, 400);

  const allowed = await enforceRateLimit("guestbook", slug, ip, 4, 60);
  if (!allowed) return json({ error: "RATE_LIMITED" }, 429);

  const { error } = await db.from("garden_guestbook").insert({
    garden_id: garden.id,
    guest_name: guestName,
    message,
    status: "pending",
  });
  if (error) {
    console.error("Guestbook insert failed:", error.message);
    return json({ error: "SUBMIT_FAILED" }, 500);
  }
  return json({ ok: true, message: "Lời nhắn đã được gửi và đang chờ duyệt." });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const body = await request.json() as Record<string, unknown>;
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    const action = body.action === "guestbook" ? "guestbook" : "view";
    if (!/^[a-z0-9-]{12,80}$/.test(slug)) return json({ error: "NOT_FOUND" }, 404);

    const garden = await loadGarden(slug);
    if (!garden) return json({ error: "NOT_FOUND" }, 404);

    const ip = requestIp(request);
    if (action === "guestbook") {
      const pin = typeof body.pin === "string" ? body.pin.trim() : "";
      return await submitGuestbook(garden, slug, ip, pin, body);
    }

    const pin = typeof body.pin === "string" ? body.pin.trim() : "";
    return await viewGarden(garden, pin, slug, ip);
  } catch (error) {
    console.error("Garden share request failed:", error instanceof Error ? error.message : error);
    return json({ error: "INTERNAL_ERROR" }, 500);
  }
});
