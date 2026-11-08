"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type PointerEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import PhotoLightbox from "@/features/garden/components/PhotoLightbox";
import { useRouter } from "next/navigation";
import Flower from "@/features/flowers/components/Flower";
import type { FlowerKind } from "@/types/flower";
import { adminSupabase } from "@/lib/adminSupabase";
import { FAIRYTALE_TEST_GARDEN_ID } from "@/features/garden/data/gardenThemes";
import styles from "../styles/GardenStudio.module.css";

type GardenRow = {
  id: string;
  owner_id: string;
  name: string;
  introduction: string | null;
  letter_title: string;
  letter_paragraphs: string[];
  letter_signature: string;
  share_slug: string | null;
  is_published: boolean;
  published_at: string | null;
  cover_path: string | null;
  experience_settings: Record<string, unknown> | null;
  guestbook_enabled: boolean;
  created_at: string;
};

type ChapterRow = {
  chapter_id: string;
  sort_order: number;
  title: string;
  paragraphs: string[];
};

type GardenItemRow = {
  id: string;
  kind: FlowerKind;
  color: string;
  x: number;
  depth: number;
  size: number;
  chapter_id: string | null;
  label: string | null;
  title: string | null;
  sort_order: number;
};

type GuestbookRow = {
  id: string;
  guest_name: string;
  message: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

const FLOWERS: Array<{ value: FlowerKind; label: string; color: string }> = [
  { value: "daisy", label: "Hoa cúc", color: "#e9dfc8" },
  { value: "tulip", label: "Tulip", color: "#c58c78" },
  { value: "sunflower", label: "Hướng dương", color: "#d4b56f" },
  { value: "rose", label: "Hoa hồng", color: "#c99a91" },
  { value: "lavender", label: "Oải hương", color: "#a79aaf" },
  { value: "cherry", label: "Hoa anh đào", color: "#e0c5bd" },
  { value: "lotus", label: "Hoa sen", color: "#d8b9a3" },
  { value: "dandelion", label: "Bồ công anh", color: "#d6bd79" },
];

const DEFAULT_SETTINGS = {
  weather: "clear",
  season: "spring",
  time: "day",
  wind: "breeze",
  cinematicLighting: true,
  ecologyEnabled: true,
  musicVolume: 0.55,
  musicMood: "bells",
};

function toParagraphs(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function clampValue(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function findOverlappingItems(items: GardenItemRow[], canvasWidth: number, canvasHeight: number): Set<string> {
  const bounds = items.map((item) => {
    const scale = clampValue(item.size, 0.72, 1.28);
    // Clearance envelope includes the leaf spread and the chapter label, not only the flower button box.
    const width = 160 * scale;
    const height = 190 * scale;
    const centerX = canvasWidth * item.x / 100;
    const bottom = canvasHeight * (8 + item.depth * 27) / 100;
    return {
      id: item.id,
      left: centerX - width / 2,
      right: centerX + width / 2,
      bottom,
      top: bottom + height,
    };
  });
  const collisions = new Set<string>();
  for (let leftIndex = 0; leftIndex < bounds.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < bounds.length; rightIndex += 1) {
      const left = bounds[leftIndex];
      const right = bounds[rightIndex];
      const overlapsX = left.left < right.right + 5 && left.right + 5 > right.left;
      const overlapsY = left.bottom < right.top + 4 && left.top + 4 > right.bottom;
      if (overlapsX && overlapsY) {
        collisions.add(left.id);
        collisions.add(right.id);
      }
    }
  }
  return collisions;
}

function makeShareSlug(name: string): string {
  const base = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 34) || "little-garden";
  return base + "-" + crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function hashPin(pin: string): Promise<{ salt: string; hash: string }> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = encodeBase64(saltBytes);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBytes, iterations: 180000, hash: "SHA-256" },
    key,
    256,
  );
  return { salt, hash: encodeBase64(new Uint8Array(bits)) };
}

export default function GardenStudio() {
  const router = useRouter();
  const canvasRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<{ id: string; pointerId: number; startX: number; startY: number; origins: Array<{ id: string; x: number; depth: number }> } | null>(null);

  const [authReady, setAuthReady] = useState(false);
  const [userId, setUserId] = useState("");
  const [gardens, setGardens] = useState<GardenRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [items, setItems] = useState<GardenItemRow[]>([]);
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [guestbook, setGuestbook] = useState<GuestbookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [introduction, setIntroduction] = useState("");
  const [letterTitle, setLetterTitle] = useState("Lá thư cuối");
  const [letterText, setLetterText] = useState("");
  const [signature, setSignature] = useState("");
  const [weather, setWeather] = useState("clear");
  const [season, setSeason] = useState("spring");
  const [time, setTime] = useState("day");
  const [cinematicLighting, setCinematicLighting] = useState(true);
  const [ecologyEnabled, setEcologyEnabled] = useState(true);
  const [musicVolume, setMusicVolume] = useState(55);
  const [musicMood, setMusicMood] = useState<"bells" | "piano" | "lullaby">("bells");
  const [guestbookEnabled, setGuestbookEnabled] = useState(false);
  const [pinExists, setPinExists] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [pinDraft, setPinDraft] = useState("");
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [newChapterText, setNewChapterText] = useState("");
  const [newChapterFlower, setNewChapterFlower] = useState<FlowerKind>("daisy");
  const [selectedChapterId, setSelectedChapterId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [multiSelect, setMultiSelect] = useState(false);
  const [showLayoutGrid, setShowLayoutGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridStep, setGridStep] = useState(5);
  const [coverUrl, setCoverUrl] = useState("");
  const [coverLightboxOpen, setCoverLightboxOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dirtyLayout, setDirtyLayout] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 860, height: 410 });

  const selectedGarden = gardens.find((garden) => garden.id === selectedId) ?? null;
  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;
  const selectedItems = items.filter((item) => selectedItemIds.includes(item.id));
  const overlappingItemIds = useMemo(
    () => findOverlappingItems(items, canvasSize.width, canvasSize.height),
    [items, canvasSize.width, canvasSize.height],
  );
  const selectedChapter = chapters.find((chapter) => chapter.chapter_id === selectedChapterId) ?? null;
  const shareUrl = selectedGarden?.share_slug
    ? (typeof window !== "undefined" ? window.location.origin : "https://little-flower-world.vercel.app") + "/g/" + selectedGarden.share_slug
    : "";

  const loadGardens = useCallback(async (ownerId: string) => {
    const { data, error: queryError } = await adminSupabase
      .from("gardens")
      .select("id,owner_id,name,introduction,letter_title,letter_paragraphs,letter_signature,share_slug,is_published,published_at,cover_path,experience_settings,guestbook_enabled,created_at")
      .or("owner_id.eq." + ownerId + ",id.eq." + FAIRYTALE_TEST_GARDEN_ID)
      .order("created_at", { ascending: false });

    if (queryError) throw queryError;
    const rows = (data ?? []).map((row) => ({
      ...row,
      introduction: row.introduction ?? "",
      letter_paragraphs: toParagraphs(row.letter_paragraphs),
      experience_settings: (row.experience_settings ?? {}) as Record<string, unknown>,
    })) as GardenRow[];

    setGardens(rows);
    setSelectedId((current) => rows.some((garden) => garden.id === current) ? current : rows[0]?.id ?? "");
    return rows;
  }, []);

  const loadGardenDetails = useCallback(async (garden: GardenRow) => {
    const [itemResult, chapterResult, secretResult, guestbookResult] = await Promise.all([
      adminSupabase.from("garden_items")
        .select("id,kind,color,x,depth,size,chapter_id,label,title,sort_order")
        .eq("garden_id", garden.id).order("sort_order", { ascending: true }),
      adminSupabase.from("garden_chapters")
        .select("chapter_id,sort_order,title,paragraphs")
        .eq("garden_id", garden.id).order("sort_order", { ascending: true }),
      adminSupabase.from("garden_share_secrets").select("garden_id").eq("garden_id", garden.id).maybeSingle(),
      adminSupabase.from("garden_guestbook")
        .select("id,guest_name,message,status,created_at")
        .eq("garden_id", garden.id).order("created_at", { ascending: false }).limit(60),
    ]);

    if (itemResult.error) throw itemResult.error;
    if (chapterResult.error) throw chapterResult.error;
    if (secretResult.error) throw secretResult.error;
    if (guestbookResult.error) throw guestbookResult.error;

    const loadedItems = (itemResult.data ?? []) as GardenItemRow[];
    setItems(loadedItems);
    setSelectedItemId((current) => loadedItems.some((item) => item.id === current) ? current : loadedItems[0]?.id ?? "");
    setSelectedItemIds((current) => {
      const valid = current.filter((id) => loadedItems.some((item) => item.id === id));
      return valid.length > 0 ? valid : loadedItems[0] ? [loadedItems[0].id] : [];
    });
    setChapters((chapterResult.data ?? []).map((chapter) => ({
      ...chapter,
      paragraphs: toParagraphs(chapter.paragraphs),
    })) as ChapterRow[]);
    setGuestbook((guestbookResult.data ?? []) as GuestbookRow[]);
    setPinExists(Boolean(secretResult.data));
    setPinEnabled(Boolean(secretResult.data));
    setPinDraft("");

    const settings = { ...DEFAULT_SETTINGS, ...(garden.experience_settings ?? {}) };
    setName(garden.name);
    setIntroduction(garden.introduction ?? "");
    setLetterTitle(garden.letter_title || "Lá thư cuối");
    setLetterText(toParagraphs(garden.letter_paragraphs).join("\n\n"));
    setSignature(garden.letter_signature ?? "");
    setWeather(typeof settings.weather === "string" ? settings.weather : "clear");
    setSeason(typeof settings.season === "string" ? settings.season : "spring");
    setTime(typeof settings.time === "string" ? settings.time : "day");
    setCinematicLighting(settings.cinematicLighting !== false);
    setEcologyEnabled(settings.ecologyEnabled !== false);
    setMusicVolume(typeof settings.musicVolume === "number" ? Math.round(settings.musicVolume * 100) : 55);
    setMusicMood(settings.musicMood === "piano" || settings.musicMood === "lullaby" ? settings.musicMood : "bells");
    setGuestbookEnabled(garden.guestbook_enabled === true);
    setSelectedChapterId((current) => chapterResult.data?.some((chapter) => chapter.chapter_id === current) ? current : chapterResult.data?.[0]?.chapter_id ?? "");
    setSelectedItemId((current) => itemResult.data?.some((item) => item.id === current) ? current : itemResult.data?.[0]?.id ?? "");
    setDirtyLayout(false);

    if (garden.cover_path) {
      const { data } = await adminSupabase.storage.from("garden-photos").createSignedUrl(garden.cover_path, 60 * 60);
      setCoverUrl(data?.signedUrl ?? "");
    } else {
      setCoverUrl("");
    }
  }, []);

  useEffect(() => {
    let active = true;
    void adminSupabase.auth.getSession().then(async ({ data, error: sessionError }) => {
      if (!active) return;
      const user = data.session?.user;
      if (sessionError || !user) {
        router.replace("/admin/login");
        setAuthReady(true);
        setLoading(false);
        return;
      }
      // The Studio is an owner workspace; the special admin can also manage their own gardens.
      setUserId(user.id);
      try {
        await loadGardens(user.id);
      } catch (loadError) {
        console.error("Garden Studio load failed:", loadError);
        setError("Chưa tải được danh sách khu vườn. Anh thử tải lại nhé.");
      } finally {
        if (active) {
          setAuthReady(true);
          setLoading(false);
        }
      }
    }).catch((sessionError: unknown) => {
      console.error("Garden Studio auth failed:", sessionError);
      if (active) {
        setError("Không thể xác minh phiên đăng nhập.");
        setAuthReady(true);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [loadGardens, router]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!selectedGarden || !canvas || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const rectangle = entries[0]?.contentRect;
      if (!rectangle || rectangle.width <= 0 || rectangle.height <= 0) return;
      setCanvasSize((current) => (
        Math.abs(current.width - rectangle.width) < 1 && Math.abs(current.height - rectangle.height) < 1
          ? current
          : { width: rectangle.width, height: rectangle.height }
      ));
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [selectedGarden?.id]);

  useEffect(() => {
    if (!selectedGarden) return;
    let active = true;
    // Fetching the selected garden is an external synchronization step.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadGardenDetails(selectedGarden).catch((loadError) => {
      console.error("Garden details load failed:", loadError);
      if (active) setError("Chưa tải được nội dung khu vườn.");
    });
    return () => { active = false; };
  }, [selectedGarden, loadGardenDetails]);

  async function createGarden() {
    if (!userId || saving) return;
    setSaving(true);
    setError("");
    const { data, error: insertError } = await adminSupabase.from("gardens").insert({
      owner_id: userId,
      name: "Khu vườn mới",
      introduction: "Một thế giới nhỏ được tạo nên dành riêng cho bạn.",
      letter_title: "Lá thư cuối",
      letter_paragraphs: [],
      letter_signature: "",
      experience_settings: DEFAULT_SETTINGS,
      guestbook_enabled: false,
    }).select("id").single();

    if (insertError || !data) {
      console.error("Create garden failed:", insertError);
      setError("Chưa tạo được khu vườn. Kiểm tra quyền truy cập rồi thử lại nhé.");
      setSaving(false);
      return;
    }

    const { error: flowerError } = await adminSupabase.from("garden_items").insert({
      garden_id: data.id,
      kind: "daisy",
      color: "#e9dfc8",
      x: 50,
      depth: 0.3,
      size: 0.78,
      chapter_id: null,
      label: null,
      title: null,
      sort_order: 1,
    });
    if (flowerError) console.warn("Create starter flower failed:", flowerError);
    const rows = await loadGardens(userId);
    setSelectedId(data.id);
    if (!rows.some((garden) => garden.id === data.id)) {
      setError("Khu vườn đã tạo nhưng chưa xuất hiện trong danh sách. Hãy tải lại.");
    } else {
      setNotice("Đã tạo một khu vườn mới để anh bắt đầu thiết kế.");
    }
    setSaving(false);
  }

  async function saveGarden() {
    if (!selectedGarden || saving) return;
    if (pinEnabled && !pinExists && pinDraft.trim().length < 6) {
      setError("Mã PIN cần ít nhất 6 ký tự trước khi bật bảo vệ link.");
      return;
    }
    if (pinEnabled && pinDraft.trim() && pinDraft.trim().length < 6) {
      setError("Mã PIN cần ít nhất 6 ký tự để đủ an toàn.");
      return;
    }
    setSaving(true);
    setError("");
    const settings = {
      weather,
      season,
      time,
      wind: "breeze",
      cinematicLighting,
      ecologyEnabled,
      musicVolume: musicVolume / 100,
      musicMood,
      musicEnabled: true,
    };
    const { error: updateError } = await adminSupabase.from("gardens").update({
      name: name.trim() || "Khu vườn nhỏ",
      introduction: introduction.trim(),
      letter_title: letterTitle.trim() || "Lá thư cuối",
      letter_paragraphs: letterText.split(/\n\s*\n/).map((text) => text.trim()).filter(Boolean),
      letter_signature: signature.trim(),
      experience_settings: settings,
      guestbook_enabled: guestbookEnabled,
    }).eq("id", selectedGarden.id);

    if (updateError) {
      console.error("Save garden failed:", updateError);
      setError("Chưa lưu được nội dung khu vườn.");
      setSaving(false);
      return;
    }

    if (!pinEnabled && pinExists) {
      const { error: deletePinError } = await adminSupabase.from("garden_share_secrets").delete().eq("garden_id", selectedGarden.id);
      if (deletePinError) {
        console.error("Remove garden PIN failed:", deletePinError);
        setError("Nội dung đã lưu nhưng chưa gỡ được mã PIN cũ.");
        setSaving(false);
        return;
      }
      setPinExists(false);
    } else if (pinEnabled && pinDraft.trim()) {
      const { salt, hash } = await hashPin(pinDraft.trim());
      const { error: pinError } = await adminSupabase.from("garden_share_secrets").upsert({
        garden_id: selectedGarden.id,
        pin_salt: salt,
        pin_hash: hash,
        iterations: 180000,
        updated_at: new Date().toISOString(),
      });
      if (pinError) {
        console.error("Save garden PIN failed:", pinError);
        setError("Nội dung đã lưu nhưng chưa cập nhật được mã PIN.");
        setSaving(false);
        return;
      }
      setPinExists(true);
      setPinDraft("");
    }

    await loadGardens(userId);
    setNotice("Đã lưu nội dung và cấu hình khu vườn.");
    setSaving(false);
  }

  async function publishGarden(publish: boolean) {
    if (!selectedGarden || saving) return;
    if (publish && (!name.trim() || chapters.length === 0)) {
      setError("Để xuất bản, anh cần đặt tên vườn và tạo ít nhất một chương truyện.");
      return;
    }
    if (pinEnabled && !pinExists && pinDraft.trim().length < 6) {
      setError("Mã PIN cần ít nhất 6 ký tự trước khi xuất bản link được bảo vệ.");
      return;
    }
    if (pinEnabled && pinDraft.trim() && pinDraft.trim().length < 6) {
      setError("Mã PIN cần ít nhất 6 ký tự để đủ an toàn.");
      return;
    }

    setSaving(true);
    setError("");
    const slug = selectedGarden.share_slug || makeShareSlug(name || selectedGarden.name);
    const settings = {
      weather,
      season,
      time,
      wind: "breeze",
      cinematicLighting,
      ecologyEnabled,
      musicVolume: musicVolume / 100,
      musicMood,
      musicEnabled: true,
    };

    // Save the authored story/scene before publishing so the public link never
    // exposes a half-saved version of the garden.
    const { error: contentError } = await adminSupabase.from("gardens").update({
      name: name.trim() || "Khu vườn nhỏ",
      introduction: introduction.trim(),
      letter_title: letterTitle.trim() || "Lá thư cuối",
      letter_paragraphs: letterText.split(/\n\s*\n/).map((text) => text.trim()).filter(Boolean),
      letter_signature: signature.trim(),
      experience_settings: settings,
      guestbook_enabled: guestbookEnabled,
    }).eq("id", selectedGarden.id);

    if (contentError) {
      console.error("Save before publish failed:", contentError);
      setError("Chưa lưu được nội dung trước khi xuất bản.");
      setSaving(false);
      return;
    }

    if (!pinEnabled && pinExists) {
      const { error: deletePinError } = await adminSupabase.from("garden_share_secrets").delete().eq("garden_id", selectedGarden.id);
      if (deletePinError) {
        console.error("Remove garden PIN failed:", deletePinError);
        setError("Nội dung đã lưu nhưng chưa gỡ được mã PIN cũ.");
        setSaving(false);
        return;
      }
      setPinExists(false);
    } else if (pinEnabled && pinDraft.trim()) {
      const { salt, hash } = await hashPin(pinDraft.trim());
      const { error: pinError } = await adminSupabase.from("garden_share_secrets").upsert({
        garden_id: selectedGarden.id,
        pin_salt: salt,
        pin_hash: hash,
        iterations: 180000,
        updated_at: new Date().toISOString(),
      });
      if (pinError) {
        console.error("Save garden PIN failed:", pinError);
        setError("Nội dung đã lưu nhưng chưa cập nhật được mã PIN.");
        setSaving(false);
        return;
      }
      setPinExists(true);
      setPinDraft("");
    }

    const { error: publishError } = await adminSupabase.from("gardens").update({
      share_slug: slug,
      is_published: publish,
      published_at: publish ? selectedGarden.published_at || new Date().toISOString() : null,
    }).eq("id", selectedGarden.id);

    if (publishError) {
      console.error("Publish garden failed:", publishError);
      setError("Nội dung đã lưu nhưng chưa cập nhật được trạng thái xuất bản.");
      setSaving(false);
      return;
    }

    await loadGardens(userId);
    setNotice(publish ? "Khu vườn đã được xuất bản. Anh có thể gửi đường link cho người nhận." : "Khu vườn đã chuyển về bản nháp; link chia sẻ sẽ không còn mở được.");
    setSaving(false);
  }

  async function addChapter() {
    if (!selectedGarden || !newChapterTitle.trim() || saving) return;
    setSaving(true);
    setError("");
    const chapterId = "story-" + crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    const order = chapters.length + 1;
    const paragraphs = newChapterText.split(/\n\s*\n/).map((value) => value.trim()).filter(Boolean);
    const { error: chapterError } = await adminSupabase.from("garden_chapters").insert({
      garden_id: selectedGarden.id,
      chapter_id: chapterId,
      sort_order: order,
      title: newChapterTitle.trim(),
      paragraphs,
    });

    if (chapterError) {
      console.error("Add chapter failed:", chapterError);
      setError("Chưa thêm được chương truyện.");
      setSaving(false);
      return;
    }

    const flower = FLOWERS.find((item) => item.value === newChapterFlower) ?? FLOWERS[0];
    const { error: itemError } = await adminSupabase.from("garden_items").insert({
      garden_id: selectedGarden.id,
      kind: flower.value,
      color: flower.color,
      x: Math.min(88, 18 + chapters.length * 16),
      depth: 0.25 + (chapters.length % 3) * 0.18,
      size: 0.72,
      chapter_id: chapterId,
      label: "Chương " + order,
      title: newChapterTitle.trim(),
      sort_order: order,
    });

    if (itemError) {
      console.error("Add chapter flower failed:", itemError);
      setError("Chương đã tạo nhưng chưa thêm được bông hoa. Anh thử tải lại rồi thêm hoa sau.");
    } else {
      setNewChapterTitle("");
      setNewChapterText("");
      await loadGardenDetails(selectedGarden);
      setSelectedChapterId(chapterId);
      setNotice("Đã thêm một chương và bông hoa mở chương đó.");
    }
    setSaving(false);
  }

  async function saveChapter() {
    if (!selectedGarden || !selectedChapter || saving) return;
    setSaving(true);
    const paragraphs = chapterDraftText.split(/\n\s*\n/).map((value) => value.trim()).filter(Boolean);
    const { error: chapterError } = await adminSupabase.from("garden_chapters").update({
      title: chapterDraftTitle.trim(),
      paragraphs,
    }).eq("garden_id", selectedGarden.id).eq("chapter_id", selectedChapter.chapter_id);

    if (chapterError) {
      setError("Chưa lưu được chương truyện.");
      setSaving(false);
      return;
    }
    const { error: flowerError } = await adminSupabase.from("garden_items").update({
      title: chapterDraftTitle.trim(),
      label: "Chương " + (selectedChapter.sort_order || 1),
    }).eq("garden_id", selectedGarden.id).eq("chapter_id", selectedChapter.chapter_id);
    if (flowerError) console.warn("Update chapter flower label failed:", flowerError);
    await loadGardenDetails(selectedGarden);
    setNotice("Đã cập nhật chương truyện.");
    setSaving(false);
  }

  const [chapterDraftTitle, setChapterDraftTitle] = useState("");
  const [chapterDraftText, setChapterDraftText] = useState("");

  useEffect(() => {
    // Keep the editable form draft aligned with the chapter selected in the list.
    /* eslint-disable react-hooks/set-state-in-effect */
    setChapterDraftTitle(selectedChapter?.title ?? "");
    setChapterDraftText(selectedChapter?.paragraphs.join("\n\n") ?? "");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [selectedChapter?.chapter_id, selectedChapter?.title, selectedChapter?.paragraphs]);

  async function deleteChapter(chapterId: string) {
    if (!selectedGarden || !window.confirm("Xóa chương và bông hoa mở chương này khỏi khu vườn?")) return;
    const { error: deleteError } = await adminSupabase.from("garden_chapters")
      .delete().eq("garden_id", selectedGarden.id).eq("chapter_id", chapterId);
    if (deleteError) {
      setError("Chưa xóa được chương này.");
      return;
    }
    await loadGardenDetails(selectedGarden);
    setNotice("Đã xóa chương truyện.");
  }

  function snapCoordinate(value: number, step: number) {
    return snapToGrid ? Math.round(value / step) * step : value;
  }

  function selectCanvasItem(itemId: string, additive: boolean) {
    setSelectedItemId(itemId);
    setSelectedItemIds((current) => {
      if (!additive) return [itemId];
      return current.includes(itemId) ? current : [...current, itemId];
    });
  }

  function handleDragStart(event: PointerEvent<HTMLButtonElement>, itemId: string) {
    if (event.button !== 0) return;

    const additive = multiSelect || event.shiftKey;
    const movingIds = additive
      ? [...new Set([...selectedItemIds, itemId])]
      : [itemId];
    const origins = items
      .filter((item) => movingIds.includes(item.id))
      .map((item) => ({ id: item.id, x: item.x, depth: item.depth }));

    // Capture on the canvas, which owns pointer-move/up handlers.
    try {
      canvasRef.current?.setPointerCapture(event.pointerId);
    } catch {
      // Pointer events remain usable without capture on older/embedded browsers.
    }

    draggingRef.current = {
      id: itemId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origins,
    };
    selectCanvasItem(itemId, additive);
  }

  function handleCanvasMove(event: PointerEvent<HTMLDivElement>) {
    const dragging = draggingRef.current;
    const canvas = canvasRef.current;
    if (!dragging || !canvas || dragging.pointerId !== event.pointerId) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const deltaX = ((event.clientX - dragging.startX) / rect.width) * 100;
    const deltaDepth = -((event.clientY - dragging.startY) / rect.height) / 0.27;
    const xStep = gridStep;
    const depthStep = gridStep / 27;
    const originMap = new Map(dragging.origins.map((origin) => [origin.id, origin]));

    setItems((current) => current.map((item) => {
      const origin = originMap.get(item.id);
      if (!origin) return item;
      const x = Math.max(6, Math.min(94, snapCoordinate(origin.x + deltaX, xStep)));
      const depth = Math.max(0, Math.min(1, snapCoordinate(origin.depth + deltaDepth, depthStep)));
      return { ...item, x, depth };
    }));
    setDirtyLayout(true);
  }

  function handleCanvasEnd(event: PointerEvent<HTMLDivElement>) {
    const dragging = draggingRef.current;
    if (dragging?.pointerId === event.pointerId) draggingRef.current = null;
  }

  function moveSelection(horizontal: number, depthDirection: number, targetIds: string[] = selectedItems.map((item) => item.id)) {
    const ids = targetIds.length > 0 ? targetIds : selectedItemId ? [selectedItemId] : [];
    if (ids.length === 0) {
      setNotice("Anh chọn một bông hoa trước khi di chuyển nhé.");
      return;
    }

    const step = snapToGrid ? gridStep : 1;
    const depthStep = step / 27;
    const selectedIdSet = new Set(ids);
    let changed = false;
    const nextItems = items.map((item) => {
      if (!selectedIdSet.has(item.id)) return item;
      const rawX = item.x + horizontal * step;
      const rawDepth = item.depth + depthDirection * depthStep;
      const x = clampValue(snapToGrid ? Math.round(rawX / step) * step : rawX, 6, 94);
      const depth = clampValue(snapToGrid ? Math.round(rawDepth / depthStep) * depthStep : rawDepth, 0, 1);
      if (Math.abs(x - item.x) > 0.001 || Math.abs(depth - item.depth) > 0.00001) changed = true;
      return { ...item, x, depth };
    });

    if (!changed) {
      setNotice("Hoa đã ở giới hạn của khu vườn theo hướng đó.");
      return;
    }
    setItems(nextItems);
    setDirtyLayout(true);
    const direction = horizontal < 0 ? "sang trái" : horizontal > 0 ? "sang phải" : depthDirection > 0 ? "ra phía sau" : "ra phía trước";
    setNotice("Đã dịch " + ids.length + " hoa " + direction + ".");
  }

  function autoArrangeGarden() {
    if (items.length === 0) return;
    const columns = items.length <= 6 ? items.length : Math.min(8, Math.ceil(items.length / 2));
    const rows = Math.ceil(items.length / columns);
    const spacing = columns > 1 ? 80 / (columns - 1) : 0;
    const rowOffset = Math.min(8, spacing / 2);
    const ordered = [...items].sort((left, right) => left.sort_order - right.sort_order);
    const positions = new Map<string, { x: number; depth: number }>();

    ordered.forEach((item, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;
      const offset = row % 2 === 1 ? rowOffset : 0;
      const x = clampValue(10 + column * spacing + offset, 6, 94);
      const depth = rows === 1 ? 0.5 : 0.94 - (row * 0.9) / (rows - 1);
      positions.set(item.id, { x, depth: clampValue(depth, 0.04, 0.96) });
    });

    setItems((current) => current.map((item) => {
      const position = positions.get(item.id);
      return position ? { ...item, ...position } : item;
    }));
    setDirtyLayout(true);
    const first = ordered[0];
    setSelectedItemId(first.id);
    setSelectedItemIds([first.id]);
    setNotice("Đã tự dàn " + items.length + " hoa thành " + rows + " hàng thoáng, giữ nguyên nội dung và loài hoa. Bấm “Lưu bố cục” để áp dụng.");
  }

  function updateSelectedPosition(axis: "x" | "depth", value: number) {
    if (!Number.isFinite(value) || !selectedItemId) return;
    setItems((current) => current.map((item) => {
      if (item.id !== selectedItemId) return item;
      return axis === "x"
        ? { ...item, x: Math.max(6, Math.min(94, value)) }
        : { ...item, depth: Math.max(0, Math.min(1, value / 100)) };
    }));
    setDirtyLayout(true);
  }

  function handleCanvasKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      moveSelection(
        event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0,
        event.key === "ArrowUp" ? 1 : event.key === "ArrowDown" ? -1 : 0,
      );
    }
  }

  function alignSelection(mode: "center" | "row" | "column" | "distribute-x" | "distribute-depth") {
    const ids = selectedItems.map((item) => item.id);
    if (ids.length === 0) return;
    if ((mode === "distribute-x" || mode === "distribute-depth") && ids.length < 3) return;

    setItems((current) => {
      const chosen = current.filter((item) => ids.includes(item.id));
      if (chosen.length === 0) return current;
      const nextPositions = new Map<string, { x: number; depth: number }>();

      if (mode === "center") {
        const minX = Math.min(...chosen.map((item) => item.x));
        const maxX = Math.max(...chosen.map((item) => item.x));
        const minDepth = Math.min(...chosen.map((item) => item.depth));
        const maxDepth = Math.max(...chosen.map((item) => item.depth));
        const shiftX = 50 - (minX + maxX) / 2;
        const shiftDepth = 0.5 - (minDepth + maxDepth) / 2;
        chosen.forEach((item) => nextPositions.set(item.id, {
          x: Math.max(6, Math.min(94, snapCoordinate(item.x + shiftX, gridStep))),
          depth: Math.max(0, Math.min(1, snapCoordinate(item.depth + shiftDepth, gridStep / 27))),
        }));
      } else if (mode === "row") {
        const average = chosen.reduce((sum, item) => sum + item.depth, 0) / chosen.length;
        const depth = Math.max(0, Math.min(1, snapCoordinate(average, gridStep / 27)));
        chosen.forEach((item) => nextPositions.set(item.id, { x: item.x, depth }));
      } else if (mode === "column") {
        const average = chosen.reduce((sum, item) => sum + item.x, 0) / chosen.length;
        const x = Math.max(6, Math.min(94, snapCoordinate(average, gridStep)));
        chosen.forEach((item) => nextPositions.set(item.id, { x, depth: item.depth }));
      } else {
        const axis = mode === "distribute-x" ? "x" : "depth";
        const sorted = [...chosen].sort((left, right) => left[axis] - right[axis]);
        let first = sorted[0][axis];
        let last = sorted[sorted.length - 1][axis];
        if (last - first < (axis === "x" ? 12 : 0.12)) {
          const middle = (first + last) / 2;
          const spread = axis === "x" ? 24 : 0.24;
          first = Math.max(axis === "x" ? 6 : 0, middle - spread / 2);
          last = Math.min(axis === "x" ? 94 : 1, middle + spread / 2);
        }
        sorted.forEach((item, index) => {
          const value = first + ((last - first) * index) / (sorted.length - 1);
          nextPositions.set(item.id, axis === "x"
            ? { x: snapCoordinate(value, gridStep), depth: item.depth }
            : { x: item.x, depth: snapCoordinate(value, gridStep / 27) });
        });
      }

      return current.map((item) => {
        const position = nextPositions.get(item.id);
        return position ? { ...item, ...position } : item;
      });
    });
    setDirtyLayout(true);
  }

  async function discardLayout() {
    if (!selectedGarden || !dirtyLayout) return;
    await loadGardenDetails(selectedGarden);
    setNotice("Đã khôi phục bố cục đã lưu gần nhất.");
  }

  async function saveLayout() {
    if (!selectedGarden || saving || !dirtyLayout) return;
    setSaving(true);
    setError("");
    const results = await Promise.all(items.map((item) =>
      adminSupabase.from("garden_items").update({ x: item.x, depth: item.depth }).eq("id", item.id),
    ));
    const failed = results.find((result) => result.error);
    if (failed?.error) {
      console.error("Save garden layout failed:", failed.error);
      setError("Một phần vị trí chưa lưu được. Anh giữ nguyên bản nháp trên màn hình và thử lưu lại nhé.");
    } else {
      setDirtyLayout(false);
      setNotice("Đã lưu toàn bộ vị trí hoa trong khu vườn.");
    }
    setSaving(false);
  }

  async function addDecoration() {
    if (!selectedGarden || saving) return;
    const flower = FLOWERS.find((item) => item.value === newChapterFlower) ?? FLOWERS[0];
    const { data: createdItem, error: insertError } = await adminSupabase.from("garden_items").insert({
      garden_id: selectedGarden.id,
      kind: flower.value,
      color: flower.color,
      x: 50,
      depth: 0.35,
      size: 0.72,
      chapter_id: null,
      label: null,
      title: null,
      sort_order: items.length + 1,
    }).select("id").single();
    if (insertError || !createdItem) {
      console.error("Add garden decoration failed:", insertError);
      setError("Chưa thêm được bông hoa trang trí.");
      return;
    }
    await loadGardenDetails(selectedGarden);
    setSelectedItemId(createdItem.id);
    setSelectedItemIds([createdItem.id]);
    setNotice("Đã thêm hoa mới ở giữa khu vườn. Anh có thể kéo đến vị trí mong muốn.");
  }

  async function saveSelectedItem() {
    if (!selectedGarden || !selectedItem || saving) return;
    setSaving(true);
    const { error: updateError } = await adminSupabase.from("garden_items").update({
      kind: selectedItem.kind,
      color: selectedItem.color,
      size: selectedItem.size,
    }).eq("id", selectedItem.id);
    if (updateError) setError("Chưa lưu được thuộc tính bông hoa.");
    else setNotice("Đã lưu thuộc tính bông hoa.");
    await loadGardenDetails(selectedGarden);
    setSaving(false);
  }

  async function removeSelectedItem() {
    if (!selectedGarden || !selectedItem || selectedItem.chapter_id) {
      setError("Hoa gắn với chương truyện cần được xóa cùng chương để tránh mất liên kết.");
      return;
    }
    if (!window.confirm("Xóa bông hoa trang trí này?")) return;
    const { error: deleteError } = await adminSupabase.from("garden_items").delete().eq("id", selectedItem.id);
    if (deleteError) setError("Chưa xóa được bông hoa.");
    else await loadGardenDetails(selectedGarden);
  }

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selectedGarden || uploading) return;
    const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
    if (!allowed.has(file.type) || file.size > 10 * 1024 * 1024) {
      setError("Ảnh cần là JPG, PNG, WEBP hoặc AVIF và không quá 10 MB.");
      return;
    }
    setUploading(true);
    const extension = file.name.split(".").pop()?.toLowerCase() || "webp";
    const path = selectedGarden.id + "/" + crypto.randomUUID() + "." + extension;
    const { error: uploadError } = await adminSupabase.storage.from("garden-photos").upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) {
      console.error("Upload garden image failed:", uploadError);
      setError("Chưa tải được ảnh. Anh thử lại nhé.");
      setUploading(false);
      return;
    }
    const { error: updateError } = await adminSupabase.from("gardens").update({ cover_path: path }).eq("id", selectedGarden.id);
    if (updateError) {
      setError("Ảnh đã tải lên nhưng chưa đặt được làm ảnh bìa.");
    } else {
      const { data } = await adminSupabase.storage.from("garden-photos").createSignedUrl(path, 60 * 60);
      setCoverUrl(data?.signedUrl ?? "");
      await loadGardens(userId);
      setNotice("Đã cập nhật ảnh bìa và thêm ảnh vào album.");
    }
    setUploading(false);
  }

  async function reviewGuestbook(entry: GuestbookRow, status: "approved" | "rejected") {
    const { error: updateError } = await adminSupabase.from("garden_guestbook").update({ status }).eq("id", entry.id);
    if (updateError) {
      setError("Chưa cập nhật được lời nhắn.");
      return;
    }
    if (selectedGarden) await loadGardenDetails(selectedGarden);
  }

  async function removePin() {
    if (!selectedGarden) return;
    const { error: deleteError } = await adminSupabase.from("garden_share_secrets").delete().eq("garden_id", selectedGarden.id);
    if (deleteError) setError("Chưa gỡ được mã PIN.");
    else {
      setPinExists(false);
      setPinEnabled(false);
      setPinDraft("");
      setNotice("Đã tắt bảo vệ bằng mã PIN.");
    }
  }

  async function copyShareLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setNotice("Đã sao chép đường link chia sẻ.");
    } catch {
      setError("Trình duyệt không cho phép sao chép tự động. Anh hãy chọn và sao chép đường link.");
    }
  }

  const publicQrUrl = shareUrl
    ? "https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=" + encodeURIComponent(shareUrl)
    : "";

  const approvedCount = useMemo(() => guestbook.filter((item) => item.status === "approved").length, [guestbook]);
  const pendingCount = useMemo(() => guestbook.filter((item) => item.status === "pending").length, [guestbook]);

  if (loading || !authReady) {
    return <main className={styles.loading}><span>✿</span><p>Đang mở Vanilla Garden Studio...</p></main>;
  }

  if (!userId) {
    return <main className={styles.loading}><p>{error || "Anh cần đăng nhập để mở Studio."}</p><Link href="/admin/login">Đăng nhập Admin</Link></main>;
  }

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <Link href="/" className={styles.brand}><span>✿</span><strong>Little Flower World <small>CREATOR STUDIO</small></strong></Link>
        <nav><Link href="/admin">Quản lý ảnh</Link><Link href="/admin/login">Tài khoản</Link></nav>
      </header>

      <div className={styles.intro}>
        <p className={styles.kicker}>LIVING STORY GARDEN</p>
        <h1>Tạo một thế giới của riêng anh</h1>
        <p>Thiết kế khu vườn, viết câu chuyện và gửi một lời mời để người khác bước vào khám phá.</p>
      </div>

      {error && <p className={styles.error} role="alert">{error}</p>}
      {notice && <p className={styles.notice} role="status">{notice}</p>}

      <div className={styles.workspace}>
        <aside className={styles.sidebar}>
          <div className={styles.sideHeader}><div><span className={styles.eyebrow}>MY GARDENS</span><h2>Khu vườn của anh</h2></div><button type="button" onClick={createGarden} disabled={saving}>＋ Tạo vườn</button></div>
          {gardens.length === 0 ? <p className={styles.empty}>Chưa có khu vườn nào. Hãy tạo khu vườn đầu tiên nhé.</p> : gardens.map((garden) => (
            <button key={garden.id} type="button" className={garden.id === selectedId ? styles.gardenActive : styles.gardenButton} onClick={() => setSelectedId(garden.id)}>
              <span className={styles.gardenMark}>✿</span><span><strong>{garden.name}</strong><small>{garden.is_published ? "Đã xuất bản" : "Bản nháp"}</small></span>
            </button>
          ))}
        </aside>

        {selectedGarden ? (
          <section className={styles.editor}>
            <div className={styles.editorHeading}><div><p className={styles.eyebrow}>GARDEN WORKSPACE</p><h2>{name || selectedGarden.name}</h2></div><span className={selectedGarden.is_published ? styles.published : styles.draft}>{selectedGarden.is_published ? "Đang xuất bản" : "Bản nháp"}</span></div>

            <section className={styles.section}>
              <div className={styles.sectionTitle}><span>01</span><div><h3>Danh tính khu vườn</h3><p>Tên, lời chào và thông điệp người nhận sẽ nhìn thấy.</p></div></div>
              <label>Tên khu vườn<input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} placeholder="Ví dụ: Khu vườn dành cho em"/></label>
              <label>Lời chào<input value={introduction} maxLength={500} onChange={(event) => setIntroduction(event.target.value)} placeholder="Lời chào khi người nhận bước vào"/></label>
              <label>Tiêu đề lá thư cuối<input value={letterTitle} maxLength={100} onChange={(event) => setLetterTitle(event.target.value)}/></label>
              <label>Nội dung lá thư<textarea value={letterText} onChange={(event) => setLetterText(event.target.value)} rows={4} placeholder="Mỗi đoạn cách nhau một dòng trống..."/></label>
              <label>Chữ ký<input value={signature} maxLength={80} onChange={(event) => setSignature(event.target.value)} placeholder="Người gửi"/></label>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionTitle}><span>02</span><div><h3>Khung cảnh Vanilla Garden</h3><p>Chọn bối cảnh mặc định khi khách bước vào vườn.</p></div></div>
              <div className={styles.formGrid}>
                <label>Thời tiết<select value={weather} onChange={(event) => setWeather(event.target.value)}><option value="clear">Nắng nhẹ</option><option value="cloudy">Nhiều mây</option><option value="rain">Mưa dịu</option><option value="snow">Tuyết</option></select></label>
                <label>Mùa<select value={season} onChange={(event) => setSeason(event.target.value)}><option value="spring">Mùa xuân</option><option value="summer">Mùa hạ</option><option value="autumn">Mùa thu</option><option value="winter">Mùa đông</option></select></label>
                <label>Thời gian<select value={time} onChange={(event) => setTime(event.target.value)}><option value="day">Ban ngày</option><option value="night">Ban đêm</option></select></label>
                <label>Nhạc nền<select value={musicMood} onChange={(event) => setMusicMood(event.target.value as "bells" | "piano" | "lullaby")}><option value="bells">Chuông gió trong vườn</option><option value="piano">Piano dịu dàng</option><option value="lullaby">Giai điệu đêm</option></select></label>
                <label>Âm lượng nhạc nền <strong>{musicVolume}%</strong><input type="range" min="0" max="100" value={musicVolume} onChange={(event) => setMusicVolume(Number(event.target.value))}/></label>
              </div>
              <div className={styles.switchRow}><label><input type="checkbox" checked={cinematicLighting} onChange={(event) => setCinematicLighting(event.target.checked)}/> Ánh sáng điện ảnh</label><label><input type="checkbox" checked={ecologyEnabled} onChange={(event) => setEcologyEnabled(event.target.checked)}/> Bướm và sinh vật</label></div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionTitle}><span>03</span><div><h3>Bố cục khu vườn</h3><p>Kéo hoa trên khu vườn để sắp xếp. Thay đổi sẽ được lưu vào bản thiết kế.</p></div></div>
              <div className={styles.layoutTopbar}>
                <div className={styles.layoutToggles}>
                  <label className={styles.layoutToggle}><input type="checkbox" checked={showLayoutGrid} onChange={(event) => setShowLayoutGrid(event.target.checked)}/> Hiện lưới căn</label>
                  <label className={styles.layoutToggle}><input type="checkbox" checked={snapToGrid} onChange={(event) => setSnapToGrid(event.target.checked)}/> Hút vào lưới</label>
                  <label className={styles.gridStepControl}>Bước lưới<select value={gridStep} onChange={(event) => setGridStep(Number(event.target.value))}><option value={5}>5%</option><option value={10}>10%</option></select></label>
                </div>
                <div className={styles.selectionControls}>
                  <label className={styles.layoutToggle}><input type="checkbox" checked={multiSelect} onChange={(event) => setMultiSelect(event.target.checked)}/> Chọn nhiều hoa</label>
                  <button type="button" onClick={() => { setSelectedItemIds([]); setSelectedItemId(""); }}>Bỏ chọn</button>
                  <span>{selectedItems.length} đang chọn</span>
                </div>
              </div>

              <div
                ref={canvasRef}
                className={styles.canvas}
                onPointerMove={handleCanvasMove}
                onPointerUp={handleCanvasEnd}
                onPointerCancel={handleCanvasEnd}
                onLostPointerCapture={() => { draggingRef.current = null; }}
                onKeyDown={handleCanvasKeyDown}
                tabIndex={0}
                role="group"
                aria-label="Bản đồ bố cục khu vườn. Chọn hoa rồi dùng phím mũi tên để di chuyển."
              >
                <div className={styles.canvasRulerX} aria-hidden="true">
                  {[0, 25, 50, 75, 100].map((value) => <span key={value} style={{ left: value + "%" }}>{value}</span>)}
                </div>
                <div className={styles.canvasDepthLabels} aria-hidden="true"><span>SAU</span><span>TRƯỚC</span></div>
                <div className={styles.canvasDepthPlane} aria-hidden="true"/>
                {showLayoutGrid && <div className={styles.canvasGrid} style={{ ["--grid-step" as string]: gridStep + "%", ["--grid-depth-step" as string]: (gridStep / 27 * 100) + "%" }} aria-hidden="true"/>}
                <span className={styles.canvasSun}/><span className={styles.canvasPond}/><span className={styles.canvasPath}/>
                {items.map((item) => {
                  const isSelected = selectedItemIds.includes(item.id);
                  const isFocused = item.id === selectedItemId;
                  const isOverlapping = overlappingItemIds.has(item.id);
                  const flowerClasses = [
                    styles.flowerHandle,
                    isSelected ? styles.flowerSelected : "",
                    isFocused ? styles.flowerFocused : "",
                    isOverlapping ? styles.flowerCollision : "",
                  ].filter(Boolean).join(" ");
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={flowerClasses}
                      style={{
                        left: clampValue(item.x, 6, 94) + "%",
                        bottom: (8 + item.depth * 27) + "%",
                        zIndex: isFocused ? 120 : isSelected ? 110 : 20 + Math.round((1 - item.depth) * 40),
                        ["--flower-scale" as string]: Math.max(0.72, Math.min(1.28, item.size)),
                      }}
                      onPointerDown={(event) => handleDragStart(event, item.id)}
                      onClick={(event) => selectCanvasItem(item.id, multiSelect || event.shiftKey)}
                      aria-pressed={isSelected}
                      aria-label={"Chọn " + (FLOWERS.find((flower) => flower.value === item.kind)?.label ?? "bông hoa") + (item.title ? ": " + item.title : "")}
                      title={(item.title || item.label || "Hoa trang trí") + " · X " + Math.round(item.x) + "% · " + Math.round(item.depth * 100) + "% chiều sâu"}
                    >
                      <Flower kind={item.kind} color={item.color} size={0.42}/>
                      {item.chapter_id && <span>{item.label || "Chương"}</span>}
                    </button>
                  );
                })}
                {items.length === 0 && <p className={styles.canvasHint}>Thêm hoa hoặc chương để bắt đầu bố trí.</p>}
              </div>

              <div className={styles.layoutActionGroups}>
                <div className={styles.layoutActionGroup}>
                  <span className={styles.layoutGroupLabel}>Căn chỉnh</span>
                  <button type="button" onClick={() => alignSelection("center")} disabled={selectedItems.length === 0}>Căn giữa khu vườn</button>
                  <button type="button" onClick={() => alignSelection("row")} disabled={selectedItems.length < 2}>Cùng hàng</button>
                  <button type="button" onClick={() => alignSelection("column")} disabled={selectedItems.length < 2}>Cùng cột</button>
                </div>
                <div className={styles.layoutActionGroup}>
                  <span className={styles.layoutGroupLabel}>Phân bố đều</span>
                  <button type="button" onClick={() => alignSelection("distribute-x")} disabled={selectedItems.length < 3}>Đều ngang</button>
                  <button type="button" onClick={() => alignSelection("distribute-depth")} disabled={selectedItems.length < 3}>Đều chiều sâu</button>
                </div>
                <div className={styles.layoutActionGroup}>
                  <span className={styles.layoutGroupLabel}>Di chuyển chính xác</span>
                  <button type="button" onClick={() => moveSelection(-1, 0)} disabled={selectedItems.length === 0 && !selectedItemId} aria-label="Dịch hoa sang trái">← Trái</button>
                  <button type="button" onClick={() => moveSelection(1, 0)} disabled={selectedItems.length === 0 && !selectedItemId} aria-label="Dịch hoa sang phải">Phải →</button>
                  <button type="button" onClick={() => moveSelection(0, 1)} disabled={selectedItems.length === 0 && !selectedItemId} aria-label="Đưa hoa ra phía sau">↑ Sau</button>
                  <button type="button" onClick={() => moveSelection(0, -1)} disabled={selectedItems.length === 0 && !selectedItemId} aria-label="Đưa hoa ra phía trước">↓ Trước</button>
                </div>
              </div>

              <div className={styles.canvasTools}>
                <label>Loài hoa<select value={newChapterFlower} onChange={(event) => setNewChapterFlower(event.target.value as FlowerKind)}>{FLOWERS.map((flower) => <option key={flower.value} value={flower.value}>{flower.label}</option>)}</select></label>
                <button type="button" onClick={autoArrangeGarden} disabled={items.length < 2 || saving}>✧ Tự dàn hoa</button>
                <button type="button" onClick={addDecoration} disabled={saving}>＋ Thêm hoa trang trí</button>
                <button type="button" onClick={discardLayout} disabled={!dirtyLayout || saving}>Hoàn tác</button>
                <button type="button" onClick={saveLayout} disabled={!dirtyLayout || saving}>{saving ? "Đang lưu..." : "Lưu bố cục"}</button>
              </div>
              <p className={styles.layoutHint}>
                {overlappingItemIds.size > 0
                  ? "Đang có " + overlappingItemIds.size + " hoa chồng vùng hiển thị. Bấm “Tự dàn hoa” để tách các hàng, sau đó lưu bố cục."
                  : "Kéo hoa để đổi vị trí; giữ Shift hoặc bật “Chọn nhiều” để chọn nhóm. Mũi tên dịch theo bước lưới. Hoa được giữ trong mép sân để không bị cắt."}
              </p>
              {selectedItem && <div className={styles.itemEditor}>
                <strong>{selectedItems.length > 1 ? selectedItems.length + " hoa đang chọn · đang chỉnh " : "Đang chỉnh "}{selectedItem.title || selectedItem.label || "Hoa trang trí"}</strong>
                <label>Vị trí ngang X (%)<input type="number" min="6" max="94" step="1" value={Math.round(selectedItem.x)} onChange={(event) => updateSelectedPosition("x", Number(event.target.value))}/></label>
                <label>Chiều sâu (%)<input type="number" min="0" max="100" step="1" value={Math.round(selectedItem.depth * 100)} onChange={(event) => updateSelectedPosition("depth", Number(event.target.value))}/></label>
                <label>Kích thước<input type="range" min="0.3" max="1.3" step="0.05" value={selectedItem.size} onChange={(event) => setItems((current) => current.map((item) => item.id === selectedItem.id ? { ...item, size: Number(event.target.value) } : item))}/></label>
                <label>Màu hoa<input type="color" value={selectedItem.color} onChange={(event) => setItems((current) => current.map((item) => item.id === selectedItem.id ? { ...item, color: event.target.value } : item))}/></label>
                <button type="button" onClick={saveSelectedItem} disabled={saving}>Lưu hoa đang chỉnh</button>
                {!selectedItem.chapter_id && <button type="button" className={styles.dangerButton} onClick={removeSelectedItem} disabled={saving}>Xóa hoa</button>}
              </div>}
            </section>

            <section className={styles.section}>
              <div className={styles.sectionTitle}><span>04</span><div><h3>Câu chuyện ẩn trong hoa</h3><p>Mỗi chương sẽ có một bông hoa để người nhận chạm vào và đọc.</p></div></div>
              <div className={styles.chapterList}>
                {chapters.map((chapter) => <div key={chapter.chapter_id} className={styles.chapterEntry}>
                  <button type="button" onClick={() => setSelectedChapterId(chapter.chapter_id)} className={selectedChapterId === chapter.chapter_id ? styles.chapterActive : styles.chapterButton}>
                    <span>✿</span><span><strong>{chapter.title}</strong><small>Chương {chapter.sort_order}</small></span>
                  </button>
                  <button type="button" className={styles.deleteText} onClick={() => void deleteChapter(chapter.chapter_id)}>Xóa</button>
                </div>)}
              </div>
              {selectedChapter && <div className={styles.chapterEditor}>
                <label>Tên chương<input value={chapterDraftTitle} onChange={(event) => setChapterDraftTitle(event.target.value)}/></label>
                <label>Nội dung<textarea rows={5} value={chapterDraftText} onChange={(event) => setChapterDraftText(event.target.value)}/></label>
                <button type="button" onClick={saveChapter} disabled={saving}>Lưu chương đang chọn</button>
              </div>}
              <div className={styles.addChapter}>
                <h4>＋ Thêm chương mới</h4>
                <label>Tên chương<input value={newChapterTitle} onChange={(event) => setNewChapterTitle(event.target.value)} placeholder="Một kỷ niệm nhỏ..."/></label>
                <label>Nội dung<textarea rows={4} value={newChapterText} onChange={(event) => setNewChapterText(event.target.value)} placeholder="Viết từng đoạn của câu chuyện..."/></label>
                <label>Hoa mở chương<select value={newChapterFlower} onChange={(event) => setNewChapterFlower(event.target.value as FlowerKind)}>{FLOWERS.map((flower) => <option key={flower.value} value={flower.value}>{flower.label}</option>)}</select></label>
                <button type="button" onClick={addChapter} disabled={saving || !newChapterTitle.trim()}>Thêm chương và hoa</button>
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionTitle}><span>05</span><div><h3>Ảnh và album kỷ niệm</h3><p>Ảnh được lưu trong kho riêng của khu vườn; bản chia sẻ dùng URL ảnh ký hạn.</p></div></div>
              {coverUrl && <button type="button" className={styles.coverOpen} onClick={() => setCoverLightboxOpen(true)} aria-label="Phóng to ảnh bìa"><Image className={styles.coverPreview} src={coverUrl} alt="Ảnh bìa khu vườn" width={1200} height={675} unoptimized/></button>}
              <label className={styles.uploadButton}>＋ Tải ảnh lên / đổi ảnh bìa<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => void uploadPhoto(event)} disabled={uploading}/></label>
              {uploading && <p className={styles.muted}>Đang tải ảnh lên...</p>}
            </section>

            <section className={styles.section}>
              <div className={styles.sectionTitle}><span>06</span><div><h3>Sổ lưu bút của người ghé thăm</h3><p>Khách gửi lời nhắn; anh duyệt trước khi lời nhắn xuất hiện công khai.</p></div></div>
              <label className={styles.checkbox}><input type="checkbox" checked={guestbookEnabled} onChange={(event) => setGuestbookEnabled(event.target.checked)}/> Cho phép khách để lại lời nhắn</label>
              <div className={styles.stats}><span>{pendingCount} chờ duyệt</span><span>{approvedCount} đã duyệt</span></div>
              {guestbook.map((entry) => <div className={styles.guestEntry} key={entry.id}>
                <div><strong>{entry.guest_name}</strong><small>{new Date(entry.created_at).toLocaleString("vi-VN")}</small><p>{entry.message}</p></div>
                <span className={styles.status}>{entry.status === "pending" ? "Chờ duyệt" : entry.status === "approved" ? "Đã duyệt" : "Đã ẩn"}</span>
                {entry.status !== "approved" && <button type="button" onClick={() => void reviewGuestbook(entry, "approved")}>Duyệt</button>}
                {entry.status !== "rejected" && <button type="button" className={styles.deleteText} onClick={() => void reviewGuestbook(entry, "rejected")}>Ẩn</button>}
              </div>)}
              {guestbook.length === 0 && <p className={styles.muted}>Chưa có lời nhắn nào.</p>}
            </section>

            <section className={styles.section}>
              <div className={styles.sectionTitle}><span>07</span><div><h3>Chia sẻ khu vườn</h3><p>Xuất bản tạo một link riêng. Bản nháp và dữ liệu chưa xuất bản không được khách truy cập.</p></div></div>
              <label className={styles.checkbox}><input type="checkbox" checked={pinEnabled} onChange={(event) => {
                if (!event.target.checked && pinExists) void removePin();
                else setPinEnabled(event.target.checked);
              }}/> Bảo vệ link bằng mã PIN</label>
              {pinEnabled && <label>Mã PIN mới (ít nhất 6 ký tự)<input type="password" value={pinDraft} onChange={(event) => setPinDraft(event.target.value)} placeholder={pinExists ? "Để trống nếu muốn giữ mã hiện tại" : "Nhập mã PIN riêng"}/></label>}
              <div className={styles.publishBar}>
                <button type="button" onClick={saveGarden} disabled={saving}>{saving ? "Đang lưu..." : "Lưu bản thiết kế"}</button>
                <button type="button" className={selectedGarden.is_published ? styles.unpublishButton : styles.publishButton} onClick={() => void publishGarden(!selectedGarden.is_published)} disabled={saving}>
                  {selectedGarden.is_published ? "Chuyển về bản nháp" : "Xuất bản khu vườn"}
                </button>
              </div>
              {selectedGarden.is_published && shareUrl && <div className={styles.shareCard}>
                <div className={styles.shareInfo}><strong>Đường link của khu vườn</strong><code>{shareUrl}</code><div><button type="button" onClick={() => void copyShareLink()}>Sao chép link</button><a href={shareUrl} target="_blank" rel="noreferrer">Mở bản xem</a></div><small>{pinExists ? "Khách cần mã PIN để mở." : "Khách có thể mở trực tiếp, không cần đăng nhập."}</small></div>
                <div className={styles.qr}><Image src={publicQrUrl} alt="Mã QR để chia sẻ khu vườn" width={240} height={240} unoptimized/><span>Quét để bước vào vườn</span></div>
              </div>}
            </section>

            <div className={styles.saveFooter}><button type="button" onClick={saveGarden} disabled={saving}>{saving ? "Đang lưu..." : "Lưu toàn bộ thay đổi"}</button><span>Mỗi khu vườn có cấu hình, câu chuyện và link riêng.</span></div>
          </section>
        ) : (
          <section className={styles.emptyEditor}><span>✿</span><h2>Khu vườn đầu tiên đang chờ anh</h2><p>Bấm “Tạo vườn” để bắt đầu một món quà mới.</p><button type="button" onClick={createGarden} disabled={saving}>＋ Tạo khu vườn</button></section>
        )}
      </div>
      <PhotoLightbox
        images={coverUrl ? [{ url: coverUrl, alt: "Ảnh bìa khu vườn" }] : []}
        activeIndex={coverLightboxOpen && coverUrl ? 0 : null}
        onClose={() => setCoverLightboxOpen(false)}
        onChange={() => setCoverLightboxOpen(false)}
      />
    </main>
  );
}
