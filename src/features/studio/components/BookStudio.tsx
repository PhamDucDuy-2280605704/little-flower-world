"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type Dispatch, type RefObject, type SetStateAction } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import GardenJournal, {
  normalizeStoryDecorations,
  STORY_STICKERS,
  type GardenJournalPhoto,
  type JournalChapter,
  type StoryDecorations,
  type StoryFormat,
  type StoryStickerId,
  type StoryTheme,
  type StoryPaper,
  type StoryEffect,
} from "@/features/garden/components/GardenJournal";
import FamilyLetterReader from "@/features/garden/components/FamilyLetterReader";
import { adminSupabase } from "@/lib/adminSupabase";
import { supabase } from "@/lib/supabase";
import { FAIRYTALE_GARDEN_ADMIN_USER_ID } from "@/features/garden/data/gardenThemes";
import styles from "../styles/BookStudio.module.css";
import { useLanguage } from "@/features/i18n/LanguageProvider";

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
  approval_status: "draft" | "pending" | "approved" | "rejected";
  review_comment: string | null;
  reviewed_at: string | null;
  created_at: string;
};
type ChapterRow = { chapter_id: string; sort_order: number; title: string; paragraphs: string[] };
type StoryOwnerDirectoryRow = { owner_id: string; display_name: string; email: string | null; story_count: number };
type GuestbookRow = { id: string; guest_name: string; message: string; status: "pending" | "approved" | "rejected"; created_at: string };
const FORMATS: Array<{ value: StoryFormat; title: string; titleEn: string; description: string; descriptionEn: string; symbol: string }> = [
  { value: "message", title: "Thông điệp", titleEn: "Message", description: "Một trang ngắn để gửi điều bạn đang nghĩ.", descriptionEn: "A short page for the words on your mind.", symbol: "✎" },
  { value: "letter", title: "Bức thư", titleEn: "Letter", description: "Một lá thư riêng với lời mở đầu và chữ ký.", descriptionEn: "A personal letter with an opening and signature.", symbol: "✉" },
  { value: "book", title: "Cuốn sách", titleEn: "Book", description: "Nhiều chương, mục lục và trải nghiệm lật trang.", descriptionEn: "Chapters, a table of contents, and page-turning.", symbol: "▤" },
];
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);
const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
  webp: "image/webp", avif: "image/avif", gif: "image/gif",
};
const IMAGE_EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
  "image/avif": "avif", "image/gif": "gif",
};
function imageMimeType(file: File): string {
  const declared = file.type.toLowerCase();
  if (IMAGE_TYPES.has(declared)) return declared;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_MIME_BY_EXTENSION[extension] ?? "";
}
function isStoredImage(fileName: string, mimeType?: string | null): boolean {
  const declared = mimeType?.toLowerCase() ?? "";
  if (IMAGE_TYPES.has(declared)) return true;
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return Object.prototype.hasOwnProperty.call(IMAGE_MIME_BY_EXTENSION, extension);
}
const CREATOR_MAX_PHOTOS = 5;
const CREATOR_MAX_STICKERS = STORY_STICKERS.length;
const DECORATION_THEMES: Array<{ value: StoryTheme; title: string; titleEn: string; detail: string; detailEn: string }> = [
  { value: "meadow", title: "Khu vườn dịu dàng", titleEn: "Gentle meadow", detail: "Xanh sage và hoa cỏ", detailEn: "Sage greens and wildflowers" },
  { value: "sunset", title: "Hoàng hôn ấm áp", titleEn: "Warm sunset", detail: "Đào, kem và nắng vàng", detailEn: "Peach, cream, and golden light" },
  { value: "starlight", title: "Đêm đầy sao", titleEn: "Starlit night", detail: "Xanh đêm và ánh trăng", detailEn: "Midnight blue and moonlight" },
];
const PAPER_FINISHES: Array<{ value: StoryPaper; title: string; titleEn: string; detail: string; detailEn: string }> = [
  { value: "ivory", title: "Giấy ngà", titleEn: "Ivory paper", detail: "Sạch và thanh lịch", detailEn: "Clean and elegant" },
  { value: "linen", title: "Giấy linen", titleEn: "Linen paper", detail: "Vân giấy nhẹ", detailEn: "Subtle paper texture" },
  { value: "rose", title: "Giấy hồng", titleEn: "Blush paper", detail: "Ấm áp và mềm mại", detailEn: "Warm and gentle" },
];
const PAGE_EFFECTS: Array<{ value: StoryEffect; title: string; titleEn: string; detail: string; detailEn: string }> = [
  { value: "page-turn", title: "Lật trang", titleEn: "Page turn", detail: "Chuyển trang như sách thật", detailEn: "Turn pages like a real book" },
  { value: "soft-glow", title: "Ánh sáng dịu", titleEn: "Soft glow", detail: "Trang giấy có độ sáng nhẹ", detailEn: "A gentle glow on each page" },
  { value: "sparkles", title: "Lấp lánh", titleEn: "Sparkles", detail: "Ánh sáng nhỏ quanh cuốn sách", detailEn: "Tiny lights around the book" },
  { value: "none", title: "Tĩnh lặng", titleEn: "Still", detail: "Không thêm hiệu ứng chuyển động", detailEn: "No additional motion" },
];

function paragraphs(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
function slugFor(value: string): string {
  const base = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 34) || "little-story";
  return base + "-" + crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}
function b64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
async function makePinHash(pin: string) {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = b64(saltBytes);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: saltBytes, iterations: 180000, hash: "SHA-256" }, key, 256);
  return { salt, hash: b64(new Uint8Array(bits)) };
}

function accountNameFor(user: { email?: string; user_metadata?: Record<string, unknown> }): string {
  const metadata = user.user_metadata ?? {};
  for (const key of ["full_name", "name", "display_name", "user_name"]) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  const emailPrefix = user.email?.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  return emailPrefix || "Tài khoản";
}

function initialsFor(label: string): string {
  const parts = label.split(/[\s._-]+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "TK";
}


function insertStickerAtCursor(textarea: HTMLInputElement | HTMLTextAreaElement | null, setValue: Dispatch<SetStateAction<string>>, emoji: string) {
  if (!textarea) {
    setValue((current) => current + (current && !/\s$/u.test(current) ? " " : "") + emoji);
    return;
  }

  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? start;
  let nextCursor = start;

  setValue((current) => {
    const safeStart = Math.max(0, Math.min(start, current.length));
    const safeEnd = Math.max(safeStart, Math.min(end, current.length));
    const before = current.slice(0, safeStart);
    const after = current.slice(safeEnd);
    const leadingSpace = before && !/\s$/u.test(before) ? " " : "";
    const trailingSpace = after && !/^\s/u.test(after) ? " " : "";
    const insertion = leadingSpace + emoji + trailingSpace;
    nextCursor = safeStart + insertion.length;
    return before + insertion + after;
  });

  window.requestAnimationFrame(() => {
    if (!textarea.isConnected) return;
    textarea.focus({ preventScroll: true });
    textarea.setSelectionRange(nextCursor, nextCursor);
  });
}

export default function BookStudio() {
  const router = useRouter();
  const { t } = useLanguage();
  const previewRef = useRef<HTMLDialogElement>(null);
  const messageTextareaRef = useRef<HTMLTextAreaElement>(null);
  const letterTextareaRef = useRef<HTMLTextAreaElement>(null);
  const bookIntroTextareaRef = useRef<HTMLTextAreaElement>(null);
  const chapterTextDraftRef = useRef<HTMLTextAreaElement>(null);
  const newChapterTextRef = useRef<HTMLTextAreaElement>(null);
  const finalLetterTextareaRef = useRef<HTMLTextAreaElement>(null);
  const storyNameInputRef = useRef<HTMLInputElement>(null);
  const finalLetterTitleInputRef = useRef<HTMLInputElement>(null);
  const [authReady, setAuthReady] = useState(false);
  const [userId, setUserId] = useState("");
  const [accountLabel, setAccountLabel] = useState("Tài khoản");
  const accountInitials = initialsFor(accountLabel);
  const [isAdmin, setIsAdmin] = useState(false);
  const activeClientRef = useRef(supabase);
  const [gardens, setGardens] = useState<GardenRow[]>([]);
  const [ownerDirectory, setOwnerDirectory] = useState<StoryOwnerDirectoryRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [photos, setPhotos] = useState<GardenJournalPhoto[]>([]);
  const [guestbook, setGuestbook] = useState<GuestbookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewReadIds, setPreviewReadIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [format, setFormat] = useState<StoryFormat>("book");
  const [decorations, setDecorations] = useState<StoryDecorations>(() => normalizeStoryDecorations(null));
  const [name, setName] = useState("");
  const [introduction, setIntroduction] = useState("");
  const [letterTitle, setLetterTitle] = useState(t("Một lá thư dành riêng cho bạn", "A letter just for you"));
  const [letterText, setLetterText] = useState("");
  const [signature, setSignature] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [coverPath, setCoverPath] = useState("");

  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [newChapterText, setNewChapterText] = useState("");
  const [selectedChapterId, setSelectedChapterId] = useState("");
  const [chapterTitleDraft, setChapterTitleDraft] = useState("");
  const [chapterTextDraft, setChapterTextDraft] = useState("");

  const [guestbookEnabled, setGuestbookEnabled] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [pinExists, setPinExists] = useState(false);
  const [pinDraft, setPinDraft] = useState("");

  const selectedGarden = gardens.find((garden) => garden.id === selectedId) ?? null;
  const guestStoryGroups = useMemo(() => {
    const grouped = new Map<string, GardenRow[]>();
    gardens.filter((garden) => garden.owner_id !== FAIRYTALE_GARDEN_ADMIN_USER_ID).forEach((garden) => {
      const stories = grouped.get(garden.owner_id) ?? [];
      stories.push(garden);
      grouped.set(garden.owner_id, stories);
    });
    return Array.from(grouped.entries()).map(([ownerId, stories]) => {
      const owner = ownerDirectory.find((entry) => entry.owner_id === ownerId);
      return {
        ownerId,
        ownerName: owner?.display_name || "Tài khoản " + ownerId.slice(0, 8),
        email: owner?.email ?? null,
        stories,
      };
    }).sort((a, b) => a.ownerName.localeCompare(b.ownerName, "vi"));
  }, [gardens, ownerDirectory]);
  const myAdminStories = gardens.filter((garden) => garden.owner_id === FAIRYTALE_GARDEN_ADMIN_USER_ID);
  const selectedOwnerName = selectedGarden?.owner_id === FAIRYTALE_GARDEN_ADMIN_USER_ID
    ? t("Admin · Chủ hệ thống", "Admin · System owner")
    : ownerDirectory.find((entry) => entry.owner_id === selectedGarden?.owner_id)?.display_name
      || t("Người dùng · Tài khoản người viết", "Member · Writer account");
  const isCreatorReviewLocked = !isAdmin && (selectedGarden?.approval_status === "pending" || selectedGarden?.approval_status === "approved");
  const selectedChapter = chapters.find((chapter) => chapter.chapter_id === selectedChapterId) ?? null;
  const journalChapters = useMemo<JournalChapter[]>(() => chapters.map((chapter) => ({
    id: chapter.chapter_id, title: chapter.title, paragraphs: chapter.paragraphs,
  })), [chapters]);
  const shareUrl = selectedGarden?.is_published && selectedGarden.share_slug
    ? (typeof window === "undefined" ? "https://little-story-world.vercel.app" : window.location.origin) + "/g/" + selectedGarden.share_slug
    : "";
  const qrUrl = shareUrl ? "https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=" + encodeURIComponent(shareUrl) : "";
  const pendingCount = guestbook.filter((entry) => entry.status === "pending").length;
  const approvedCount = guestbook.filter((entry) => entry.status === "approved").length;

  const loadGardens = useCallback(async (ownerId: string, includeAll = false) => {
    let query = activeClientRef.current.from("gardens")
      .select("id,owner_id,name,introduction,letter_title,letter_paragraphs,letter_signature,share_slug,is_published,published_at,cover_path,experience_settings,guestbook_enabled,approval_status,review_comment,reviewed_at,created_at")
      .order("created_at", { ascending: false });
    if (!includeAll) query = query.eq("owner_id", ownerId);
    const { data, error: queryError } = await query;
    if (queryError) throw queryError;
    const rows = (data ?? []).map((row) => ({
      ...row,
      introduction: row.introduction ?? "",
      letter_paragraphs: paragraphs(row.letter_paragraphs),
      experience_settings: (row.experience_settings ?? {}) as Record<string, unknown>,
    })) as GardenRow[];
    if (includeAll) {
      const { data: owners, error: ownersError } = await activeClientRef.current.rpc("admin_story_owner_directory");
      if (ownersError) {
        console.error("Load writer account directory failed:", ownersError);
        setOwnerDirectory([]);
      } else {
        setOwnerDirectory((owners ?? []) as StoryOwnerDirectoryRow[]);
      }
    } else {
      setOwnerDirectory([]);
    }
    setGardens(rows);
    setSelectedId((current) => rows.some((row) => row.id === current) ? current : rows[0]?.id ?? "");
    return rows;
  }, []);

  const loadWork = useCallback(async (garden: GardenRow) => {
    const chapterResult = await activeClientRef.current.from("garden_chapters")
      .select("chapter_id,sort_order,title,paragraphs")
      .eq("garden_id", garden.id).order("sort_order", { ascending: true });
    if (chapterResult.error) throw chapterResult.error;

    let hasPin = false;
    let guestbookRows: GuestbookRow[] = [];
    if (isAdmin || garden.approval_status === "approved") {
      const { data: secret, error: secretError } = await activeClientRef.current
        .from("garden_share_secrets").select("garden_id").eq("garden_id", garden.id).maybeSingle();
      if (secretError) throw secretError;
      hasPin = Boolean(secret);
    }
    if (isAdmin || garden.owner_id === userId) {
      const { data: notes, error: notesError } = await activeClientRef.current
        .from("garden_guestbook").select("id,guest_name,message,status,created_at")
        .eq("garden_id", garden.id).order("created_at", { ascending: false }).limit(60);
      if (notesError) throw notesError;
      guestbookRows = (notes ?? []) as GuestbookRow[];
    }

    const loadedChapters = (chapterResult.data ?? []).map((chapter) => ({
      ...chapter, paragraphs: paragraphs(chapter.paragraphs),
    })) as ChapterRow[];
    setChapters(loadedChapters);
    setSelectedChapterId((current) => loadedChapters.some((chapter) => chapter.chapter_id === current) ? current : loadedChapters[0]?.chapter_id ?? "");
    setGuestbook(guestbookRows);

    const settings = garden.experience_settings ?? {};
    const savedFormat = settings.storyFormat;
    setFormat(savedFormat === "message" || savedFormat === "letter" ? savedFormat : "book");
    setDecorations(normalizeStoryDecorations(settings.storyDecorations));
    setName(garden.name);
    setIntroduction(garden.introduction ?? "");
    setLetterTitle(garden.letter_title || t("Một lá thư dành riêng cho bạn", "A letter just for you"));
    setLetterText(paragraphs(garden.letter_paragraphs).join("\n\n"));
    setSignature(garden.letter_signature ?? "");
    setGuestbookEnabled(garden.guestbook_enabled === true);
    setPinExists(hasPin);
    setPinEnabled(hasPin);
    setPinDraft("");
    setCoverPath(garden.cover_path ?? "");

    if (garden.cover_path) {
      const { data } = await activeClientRef.current.storage.from("garden-photos").createSignedUrl(garden.cover_path, 60 * 60);
      setCoverUrl(data?.signedUrl ?? "");
    } else {
      setCoverUrl("");
    }

    const { data: files, error: albumError } = await activeClientRef.current.storage.from("garden-photos").list(garden.id, {
      limit: isAdmin ? 40 : CREATOR_MAX_PHOTOS, sortBy: { column: "created_at", order: "desc" },
    });
    if (albumError) {
      console.error("Load story album failed:", albumError);
      setPhotos([]);
      setError(t("Không tải được album ảnh của tác phẩm. Hãy thử tải lại.", "Could not load this story's photo album. Please try again."));
      return;
    }
    const imageFiles = (files ?? []).filter((file) => file.name && file.id && isStoredImage(file.name, file.metadata?.mimetype));
    const coverRecord = garden.cover_path
      ? imageFiles.find((file) => garden.id + "/" + file.name === garden.cover_path) ?? null
      : null;
    const orderedImageFiles = coverRecord
      ? [coverRecord, ...imageFiles.filter((file) => file.name !== coverRecord.name)]
      : imageFiles;
    const inlinePhotoAlts = Array.isArray(settings.inlinePhotoAlts)
      ? settings.inlinePhotoAlts.filter((alt): alt is string => typeof alt === "string")
      : [];
    const todayPhotoAlt = inlinePhotoAlts.find((alt) => alt.toLowerCase().includes("hôm nay"))
      ?? "Ảnh gia đình hôm nay";
    const oldPhotoAlt = inlinePhotoAlts.find((alt) => alt.toLowerCase().includes("ngày trước"))
      ?? "Bức ảnh gia đình ngày trước";
    const signedResults = await Promise.all(orderedImageFiles.map(async (file, index) => {
      const path = garden.id + "/" + file.name;
      const { data, error: signedError } = await activeClientRef.current.storage.from("garden-photos").createSignedUrl(path, 60 * 60);
      if (signedError || !data?.signedUrl) {
        console.error("Sign story photo failed:", path, signedError);
        return null;
      }
      const isCover = Boolean(coverRecord && file.name === coverRecord.name);
      const alt = settings.readOnlyStandalone === true
        ? (coverRecord ? (isCover ? todayPhotoAlt : oldPhotoAlt) : (index === 0 ? todayPhotoAlt : oldPhotoAlt))
        : file.name;
      return { path, url: data.signedUrl, alt };
    }));
    const loadedPhotos = signedResults.filter((photo): photo is GardenJournalPhoto => photo !== null);
    setPhotos(loadedPhotos);
    if (loadedPhotos.length !== orderedImageFiles.length) {
      setError(t("Một số ảnh không tạo được liên kết xem. Hãy kiểm tra lại album trong Admin.", "Some photos could not be signed for viewing. Please check the Admin album."));
    }
  }, [isAdmin, t, userId]);

  useEffect(() => {
    let active = true;
    void Promise.all([adminSupabase.auth.getSession(), supabase.auth.getSession()]).then(async ([adminResult, memberResult]) => {
      if (!active) return;
      const adminUser = adminResult.data.session?.user ?? null;
      const memberUser = memberResult.data.session?.user ?? null;
      const isAdminStudioPath = window.location.pathname.startsWith("/admin/studio");
      const forceAdminWorkspace = isAdminStudioPath || new URLSearchParams(window.location.search).get("mode") === "admin";
      const adminSessionValid = adminUser?.id === FAIRYTALE_GARDEN_ADMIN_USER_ID;

      // Never treat the public writer session as an Admin session.
      // Admin credentials are accepted only by the isolated private portal client.
      if (memberUser?.id === FAIRYTALE_GARDEN_ADMIN_USER_ID) {
        const { error: memberSignOutError } = await supabase.auth.signOut({ scope: "local" });
        if (memberSignOutError) {
          console.error("Clear Admin credentials from writer session failed:", memberSignOutError);
        }
        router.replace("/");
        setAuthReady(true);
        setLoading(false);
        return;
      }

      if (forceAdminWorkspace && !adminSessionValid) {
        router.replace("/");
        setAuthReady(true);
        setLoading(false);
        return;
      }

      const useAdminSession = adminSessionValid && (forceAdminWorkspace || !memberUser);
      const user = useAdminSession ? adminUser : memberUser ?? adminUser;
      if (!user) {
        router.replace("/login?next=%2Faccount");
        setAuthReady(true);
        setLoading(false);
        return;
      }
      const adminMode = user.id === FAIRYTALE_GARDEN_ADMIN_USER_ID;
      if (adminMode && !forceAdminWorkspace) {
        router.replace("/admin");
        setAuthReady(true);
        setLoading(false);
        return;
      }

      // A writer without a recovery PIN must complete setup before the studio
      // loads private drafts, including when /account is opened directly.
      if (!adminMode) {
        const { data: recoveryStatus, error: recoveryStatusError } = await supabase.functions.invoke("account-recovery", {
          body: { action: "status" },
        });
        if (!active) return;
        if (recoveryStatusError || typeof recoveryStatus?.hasPin !== "boolean") {
          setError(t("Chưa thể xác minh mã PIN bảo mật. Vui lòng tải lại hoặc đăng nhập lại.", "We couldn't verify your recovery PIN. Please reload or sign in again."));
          setAuthReady(true);
          setLoading(false);
          return;
        }
        if (recoveryStatus.hasPin !== true) {
          window.location.replace("/account/recovery-pin");
          return;
        }
      }

      activeClientRef.current = useAdminSession ? adminSupabase : memberUser ? supabase : adminSupabase;
      setIsAdmin(adminMode);
      setUserId(user.id);
      setAccountLabel(accountNameFor(user));
      try {
        const loadedGardens = await loadGardens(user.id, adminMode);
        const requestedGardenId = new URLSearchParams(window.location.search).get("garden");
        if (adminMode && requestedGardenId && loadedGardens.some((garden) => garden.id === requestedGardenId)) setSelectedId(requestedGardenId);
      } catch (loadError) {
        console.error("Load writing desk failed:", loadError);
        if (active) setError(t("Chưa tải được danh sách bản thảo. Bạn thử tải lại nhé.", "Could not load the draft list. Please reload."));
      } finally {
        if (active) { setAuthReady(true); setLoading(false); }
      }
    }).catch((sessionError: unknown) => {
      console.error("Writing desk auth failed:", sessionError);
      if (active) {
        setError(t("Không thể xác minh phiên đăng nhập.", "Could not verify your sign-in session."));
        setAuthReady(true);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [loadGardens, router, t]);

  useEffect(() => {
    if (!selectedGarden) return;
    let active = true;
    // Synchronize the selected draft with the editor fields.
    void loadWork(selectedGarden).catch((loadError) => {
      console.error("Load selected writing failed:", loadError);
      if (active) setError(t("Chưa tải được nội dung tác phẩm.", "Could not load the story content."));
    });
    return () => { active = false; };
  }, [selectedGarden, loadWork, t]);

  useEffect(() => {
    if (!authReady || isAdmin || !userId) return;
    const channel = supabase.channel("writer-review-status-" + userId)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "gardens",
        filter: "owner_id=eq." + userId,
      }, (payload) => {
        const updated = payload.new as Partial<GardenRow>;
        const current = gardens.find((garden) => garden.id === updated.id);
        if (!updated.id || !current || current.approval_status === updated.approval_status) return;
        if (updated.approval_status === "approved" || updated.approval_status === "rejected") {
          void loadGardens(userId, false).then(() => {
            setNotice(updated.approval_status === "approved"
              ? t("✉ Admin đã duyệt tác phẩm của bạn. Bạn có thể xuất bản khi sẵn sàng.", "✉ Admin approved your story. You can publish it when ready.")
              : t("✉ Admin đã phản hồi tác phẩm. Hãy xem nhận xét và chỉnh sửa trước khi gửi lại.", "✉ Admin reviewed your story. Read the feedback, make changes, and resubmit."));
          }).catch((loadError) => console.error("Refresh writer review notice failed:", loadError));
        }
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [authReady, isAdmin, userId, gardens, loadGardens, t]);

  const closePreview = useCallback(() => {
    const dialog = previewRef.current;
    if (dialog?.open) dialog.close();
    setPreviewOpen(false);
  }, []);

  useEffect(() => {
    const dialog = previewRef.current;
    if (!dialog) return;
    if (previewOpen && !dialog.open) {
      try {
        dialog.showModal();
      } catch (dialogError) {
        console.error("Open story preview dialog failed:", dialogError);
      }
    } else if (!previewOpen && dialog.open) {
      dialog.close();
    }
  }, [previewOpen]);

  function splitText(value: string) {
    return value.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  }

  function draftPayload() {
    const content = {
      name: name.trim() || t("Tác phẩm chưa đặt tên", "Untitled story"),
      introduction: introduction.trim(),
      letter_title: letterTitle.trim() || t("Một lá thư dành riêng cho bạn", "A letter just for you"),
      letter_paragraphs: splitText(letterText),
      letter_signature: signature.trim(),
      experience_settings: { ...(selectedGarden?.experience_settings ?? {}), storyFormat: format, storyDecorations: decorations },
    };
    return isAdmin ? { ...content, guestbook_enabled: guestbookEnabled } : content;
  }

  function toggleSticker(stickerId: StoryStickerId) {
    const active = decorations.stickers.includes(stickerId);
    setError("");
    setDecorations((current) => ({
      ...current,
      stickers: active ? current.stickers.filter((item) => item !== stickerId) : [...current.stickers, stickerId],
    }));
  }

  function renderWritingStickerPicker(textareaRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>, setValue: Dispatch<SetStateAction<string>>) {
    return (
      <div className={styles.inlineStickerPicker} aria-label={t("Bộ sticker chèn vào nội dung", "Writing sticker set")}>
        <div className={styles.inlineStickerHeading}>
          <strong>{t("Chèn sticker vào lời viết", "Insert a sticker into your writing")}</strong>
          <span>{t("Đặt con trỏ tại vị trí muốn chèn", "Place the cursor where you want it")}</span>
        </div>
        <div className={styles.inlineStickerChoices}>
          {STORY_STICKERS.map((sticker) => (
            <button
              key={sticker.id}
              type="button"
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => insertStickerAtCursor(textareaRef.current, setValue, sticker.emoji)}
              aria-label={t("Chèn sticker " + sticker.label, "Insert " + sticker.labelEn + " sticker")}
              title={t(sticker.label, sticker.labelEn)}
            >
              <span aria-hidden="true">{sticker.emoji}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function contentReady() {
    if (!name.trim()) return false;
    if (format === "message") return introduction.trim().length > 0;
    if (format === "letter") return letterText.trim().length > 0;
    return chapters.length > 0 && chapters.some((chapter) => chapter.paragraphs.join("\n").trim().length > 0);
  }

  async function syncPin(): Promise<boolean> {
    if (!selectedGarden) return false;
    if (!isAdmin && selectedGarden.approval_status !== "approved") return true;
    if (!pinEnabled && pinExists) {
      const { error: deleteError } = await activeClientRef.current.from("garden_share_secrets").delete().eq("garden_id", selectedGarden.id);
      if (deleteError) {
        setError(t("Nội dung đã lưu nhưng chưa gỡ được mã PIN cũ.", "Your work was saved, but the previous PIN could not be removed."));
        return false;
      }
      setPinExists(false);
      setPinDraft("");
    } else if (pinEnabled && pinDraft.trim()) {
      const { salt, hash } = await makePinHash(pinDraft.trim());
      const { error: pinError } = await activeClientRef.current.from("garden_share_secrets").upsert({
        garden_id: selectedGarden.id, pin_salt: salt, pin_hash: hash, iterations: 180000, updated_at: new Date().toISOString(),
      });
      if (pinError) {
        setError(t("Nội dung đã lưu nhưng chưa cập nhật được mã PIN.", "Your work was saved, but the PIN could not be updated."));
        return false;
      }
      setPinExists(true);
      setPinDraft("");
    }
    return true;
  }

  async function startEditingApprovedStory() {
    if (isAdmin || !selectedGarden || selectedGarden.approval_status !== "approved" || saving) return;
    const confirmed = window.confirm(t(
      "Mở chỉnh sửa sẽ gỡ liên kết công khai hiện tại và chuyển tác phẩm về bản nháp. Sau khi sửa xong, bạn cần gửi Admin duyệt lại trước khi xuất bản. Tiếp tục nhé?",
      "Reopening this story will disable its current public link and move it to draft. After editing, you must resubmit it for Admin review before it can be published. Continue?"
    ));
    if (!confirmed) return;
    setSaving(true);
    setError("");
    const { error: reopenError } = await activeClientRef.current.from("gardens")
      .update({ approval_status: "draft" })
      .eq("id", selectedGarden.id)
      .eq("owner_id", userId);
    if (reopenError) {
      console.error("Reopen approved story failed:", reopenError);
      setError(t("Chưa mở được quyền chỉnh sửa. Tác phẩm vẫn giữ nguyên trạng thái cũ.", "Could not reopen editing. The story remains unchanged."));
      setSaving(false);
      return;
    }
    await loadGardens(userId, false);
    setNotice(t("Đã mở chỉnh sửa. Liên kết cũ đã được tắt; bạn có thể sửa nội dung, chương và ảnh rồi gửi Admin duyệt lại.", "Editing is open. The old link is disabled; you can edit the story, chapters, and photos, then resubmit for review."));
    setSaving(false);
  }

  async function saveDraft() {
    if (!selectedGarden || saving) return;
    if (isCreatorReviewLocked) {
      setNotice(t("Tác phẩm đang chờ Admin duyệt nên tạm khóa chỉnh sửa.", "This story is locked while awaiting Admin review."));
      return;
    }
    if (pinEnabled && !pinExists && pinDraft.trim().length < 6) {
      setError(t("Mã PIN cần ít nhất 6 ký tự.", "The PIN must contain at least 6 characters."));
      return;
    }
    if (pinEnabled && pinDraft.trim() && pinDraft.trim().length < 6) {
      setError(t("Mã PIN cần ít nhất 6 ký tự.", "The PIN must contain at least 6 characters."));
      return;
    }
    setSaving(true);
    setError("");
    const savePayload = isAdmin ? draftPayload() : { ...draftPayload(), approval_status: "draft" as const };
    const { error: saveError } = await activeClientRef.current.from("gardens").update(savePayload).eq("id", selectedGarden.id).eq("owner_id", isAdmin ? selectedGarden.owner_id : userId);
    if (saveError) {
      console.error("Save draft failed:", saveError);
      setError(t("Chưa lưu được bản thảo.", "Could not save the draft."));
      setSaving(false);
      return;
    }
    if (!(await syncPin())) { setSaving(false); return; }
    await loadGardens(userId, isAdmin);
    setNotice(t("Đã lưu bản thảo.", "Draft saved."));
    setSaving(false);
  }

  async function publishWork(publish: boolean) {
    if (!selectedGarden || saving) return;
    if (!isAdmin && selectedGarden.owner_id !== userId) return;
    const adminOwnStory = isAdmin && selectedGarden.owner_id === FAIRYTALE_GARDEN_ADMIN_USER_ID;
    if (publish && selectedGarden.approval_status !== "approved" && !adminOwnStory) {
      setError(t("Tác phẩm cần được Admin duyệt trước khi xuất bản.", "The story must be approved by Admin before publishing."));
      return;
    }
    if (publish && !contentReady()) {
      setError(format === "message" ? t("Bạn cần viết nội dung thông điệp trước khi xuất bản.", "Write the message before publishing.")
        : format === "letter" ? t("Bạn cần viết nội dung bức thư trước khi xuất bản.", "Write the letter before publishing.")
        : t("Bạn cần tạo ít nhất một chương có nội dung trước khi xuất bản.", "Add at least one chapter with content before publishing."));
      return;
    }
    if (pinEnabled && !pinExists && pinDraft.trim().length < 6) {
      setError(t("Mã PIN cần ít nhất 6 ký tự trước khi xuất bản.", "The PIN must contain at least 6 characters before publishing."));
      return;
    }
    if (pinEnabled && pinDraft.trim() && pinDraft.trim().length < 6) {
      setError(t("Mã PIN cần ít nhất 6 ký tự.", "The PIN must contain at least 6 characters."));
      return;
    }
    setSaving(true);
    setError("");
    if (isAdmin) {
      const adminSavePayload = {
        ...draftPayload(),
        ...(adminOwnStory ? { approval_status: "approved" as const } : {}),
      };
      const { error: saveError } = await activeClientRef.current.from("gardens").update(adminSavePayload).eq("id", selectedGarden.id);
      if (saveError) {
        setError(t("Chưa lưu được nội dung trước khi xuất bản.", "Could not save the content before publishing."));
        setSaving(false);
        return;
      }
    }
    if (!(await syncPin())) { setSaving(false); return; }
    const slug = selectedGarden.share_slug || slugFor(name || selectedGarden.name);
    const publishPayload = {
      share_slug: slug,
      is_published: publish,
      published_at: publish ? selectedGarden.published_at || new Date().toISOString() : null,
      guestbook_enabled: guestbookEnabled,
    };
    let publishQuery = activeClientRef.current.from("gardens").update(publishPayload).eq("id", selectedGarden.id);
    if (!isAdmin) publishQuery = publishQuery.eq("owner_id", userId);
    const { error: publishError } = await publishQuery;
    if (publishError) {
      console.error("Publish work failed:", publishError);
      setError(t("Đã lưu nội dung nhưng chưa thay đổi được trạng thái xuất bản.", "The content was saved, but the publishing status could not be changed."));
      setSaving(false);
      return;
    }
    await loadGardens(userId, isAdmin);
    setNotice(publish ? t("Tác phẩm đã xuất bản. Bạn có thể gửi liên kết cho người nhận.", "Story published. You can share the link with the reader.") : t("Tác phẩm đã gỡ khỏi trang công khai; trạng thái duyệt vẫn được giữ.", "The story is no longer public; its approval remains in place."));
    setSaving(false);
  }

  async function saveApprovedReaderSettings() {
    if (!selectedGarden || selectedGarden.approval_status !== "approved" || saving) return;
    if (!isAdmin && selectedGarden.owner_id !== userId) return;
    if (pinEnabled && !pinExists && pinDraft.trim().length < 6) {
      setError(t("Mã PIN cần ít nhất 6 ký tự.", "The PIN must contain at least 6 characters."));
      return;
    }
    if (pinEnabled && pinDraft.trim() && pinDraft.trim().length < 6) {
      setError(t("Mã PIN cần ít nhất 6 ký tự.", "The PIN must contain at least 6 characters."));
      return;
    }
    setSaving(true);
    setError("");
    const { error: settingError } = await activeClientRef.current.from("gardens")
      .update({ guestbook_enabled: guestbookEnabled })
      .eq("id", selectedGarden.id)
      .eq("owner_id", selectedGarden.owner_id);
    if (settingError) {
      console.error("Save reader-note setting failed:", settingError);
      setError(t("Chưa lưu được cài đặt lời nhắn người đọc.", "Could not save the reader-note setting."));
      setSaving(false);
      return;
    }
    if (!(await syncPin())) {
      setSaving(false);
      return;
    }
    await loadGardens(userId, isAdmin);
    setNotice(t("Đã lưu cài đặt lời nhắn và mã PIN.", "Reader-note settings and PIN saved."));
    setSaving(false);
  }

  async function handleLogout() {
    const { error: logoutError } = await activeClientRef.current.auth.signOut({ scope: "local" });
    if (logoutError) {
      setError(t("Đăng xuất chưa thành công. Bạn thử lại nhé.", "Sign out failed. Please try again."));
      return;
    }
    router.replace(isAdmin ? "/" : "/login");
    router.refresh();
  }

  async function createWork() {
    if (!userId || saving) return;
    setSaving(true);
    setError("");
    const { data, error: createError } = await activeClientRef.current.from("gardens").insert({
      owner_id: userId,
      name: t("Tác phẩm mới", "New story"),
      introduction: "",
      letter_title: t("Một lá thư dành riêng cho bạn", "A letter just for you"),
      letter_paragraphs: [],
      letter_signature: "",
      experience_settings: { storyFormat: "book" },
      guestbook_enabled: false,
      ...(isAdmin ? { approval_status: "approved" as const } : {}),
    }).select("id").single();
    if (createError || !data) {
      console.error("Create writing failed:", createError);
      setError(t("Chưa tạo được bản thảo mới.", "Could not create a new draft."));
      setSaving(false);
      return;
    }
    await loadGardens(userId, isAdmin);
    setSelectedId(data.id);
    setNotice(t("Đã tạo bản thảo mới. Chọn kiểu tác phẩm rồi bắt đầu viết nhé.", "New draft created. Choose a format and start writing."));
    setSaving(false);
  }

  async function deleteWork(garden: GardenRow) {
    const canDelete = !garden.is_published && (
      isAdmin
      || (garden.owner_id === userId && (garden.approval_status === "draft" || garden.approval_status === "rejected"))
    );
    if (!canDelete || saving) return;

    const confirmed = window.confirm(
      t("Xóa bản thảo “", "Delete the draft “") + garden.name
      + t("” vĩnh viễn? Các chương, lưu bút, mã PIN và ảnh thuộc bản thảo này cũng sẽ bị xóa.", "” permanently? Its chapters, reader notes, PIN, and stored photos will also be deleted.")
    );
    if (!confirmed) return;

    setSaving(true);
    setError("");
    setNotice("");

    const { data: files, error: listError } = await activeClientRef.current.storage
      .from("garden-photos")
      .list(garden.id, { limit: 1000 });
    if (listError) {
      console.error("List draft photos before deletion failed:", listError);
      setError(t("Không kiểm tra được ảnh của bản thảo nên chưa xóa gì cả. Bạn thử lại nhé.", "Could not inspect the draft photos, so nothing was deleted. Please try again."));
      setSaving(false);
      return;
    }

    const photoPaths = (files ?? [])
      .filter((file) => Boolean(file.id && file.name))
      .map((file) => garden.id + "/" + file.name);
    if (photoPaths.length > 0) {
      const { error: photoDeleteError } = await activeClientRef.current.storage
        .from("garden-photos")
        .remove(photoPaths);
      if (photoDeleteError) {
        console.error("Delete draft photos failed:", photoDeleteError);
        setError(t("Chưa xóa được ảnh của bản thảo. Bản thảo vẫn được giữ nguyên.", "Could not delete the draft photos. The draft itself has been kept."));
        setSaving(false);
        return;
      }
    }

    let deleteQuery = activeClientRef.current.from("gardens").delete().eq("id", garden.id);
    if (!isAdmin) deleteQuery = deleteQuery.eq("owner_id", userId);
    const { data: deleted, error: deleteError } = await deleteQuery.select("id").maybeSingle();
    if (deleteError || !deleted) {
      console.error("Delete draft failed:", deleteError);
      setError(t("Chưa xóa được bản thảo. Nếu ảnh đã được dọn, phần nội dung vẫn được giữ để bạn thử lại.", "Could not delete the draft. If its photos were already removed, the story content is still preserved so you can retry."));
      setSaving(false);
      return;
    }

    await loadGardens(userId, isAdmin);
    setChapters([]);
    setPhotos([]);
    setGuestbook([]);
    setNotice(t("Đã xóa bản thảo và các nội dung, ảnh đi kèm.", "The draft and its associated content and photos were deleted."));
    setSaving(false);
  }

  async function addChapter() {
    if (!selectedGarden || saving || !newChapterTitle.trim()) return;
    const content = splitText(newChapterText);
    if (content.length === 0) {
      setError(t("Bạn hãy viết nội dung chương trước khi thêm nhé.", "Write the chapter content before adding it."));
      return;
    }
    setSaving(true);
    setError("");
    const id = "story-" + crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    const order = Math.max(0, ...chapters.map((chapter) => chapter.sort_order)) + 1;
    const { error: insertError } = await activeClientRef.current.from("garden_chapters").insert({
      garden_id: selectedGarden.id, chapter_id: id, sort_order: order, title: newChapterTitle.trim(), paragraphs: content,
    });
    if (insertError) {
      console.error("Add chapter failed:", insertError);
      setError(t("Chưa thêm được chương. Nội dung trong biểu mẫu vẫn được giữ.", "Could not add the chapter. Your form content has been kept."));
      setSaving(false);
      return;
    }
    const created = { chapter_id: id, sort_order: order, title: newChapterTitle.trim(), paragraphs: content };
    setChapters((current) => [...current, created]);
    setSelectedChapterId(id);
    setChapterTitleDraft(created.title);
    setChapterTextDraft(created.paragraphs.join("\n\n"));
    setNewChapterTitle("");
    setNewChapterText("");
    setNotice(t("Đã thêm chương ", "Added chapter ") + order + ".");
    setSaving(false);
  }

  function chooseChapter(chapter: ChapterRow) {
    setSelectedChapterId(chapter.chapter_id);
    setChapterTitleDraft(chapter.title);
    setChapterTextDraft(chapter.paragraphs.join("\n\n"));
  }

  async function saveChapter() {
    if (!selectedGarden || !selectedChapter || saving || !chapterTitleDraft.trim()) return;
    const content = splitText(chapterTextDraft);
    if (content.length === 0) {
      setError(t("Chương cần có nội dung trước khi lưu.", "A chapter needs content before it can be saved."));
      return;
    }
    setSaving(true);
    const { error: updateError } = await activeClientRef.current.from("garden_chapters").update({
      title: chapterTitleDraft.trim(), paragraphs: content,
    }).eq("garden_id", selectedGarden.id).eq("chapter_id", selectedChapter.chapter_id);
    if (updateError) {
      console.error("Save chapter failed:", updateError);
      setError(t("Chưa lưu được chương.", "Could not save the chapter."));
      setSaving(false);
      return;
    }
    setChapters((current) => current.map((chapter) => chapter.chapter_id === selectedChapter.chapter_id
      ? { ...chapter, title: chapterTitleDraft.trim(), paragraphs: content }
      : chapter));
    setNotice(t("Đã lưu nội dung chương.", "Chapter content saved."));
    setSaving(false);
  }

  async function deleteChapter(id: string) {
    if (!selectedGarden || saving) return;
    const chapter = chapters.find((item) => item.chapter_id === id);
    if (!window.confirm(t("Xóa chương “", "Delete chapter “") + (chapter?.title ?? "") + t("”? Nội dung sẽ không thể khôi phục.", "”? This content cannot be restored."))) return;
    const { error: deleteError } = await activeClientRef.current.from("garden_chapters").delete()
      .eq("garden_id", selectedGarden.id).eq("chapter_id", id);
    if (deleteError) {
      setError(t("Chưa xóa được chương.", "Could not delete the chapter."));
      return;
    }
    const remaining = chapters.filter((item) => item.chapter_id !== id).map((item, index) => ({ ...item, sort_order: index + 1 }));
    await Promise.all(remaining.map((item) => activeClientRef.current.from("garden_chapters").update({ sort_order: item.sort_order })
      .eq("garden_id", selectedGarden.id).eq("chapter_id", item.chapter_id)));
    setChapters(remaining);
    const next = remaining[0];
    setSelectedChapterId(next?.chapter_id ?? "");
    setChapterTitleDraft(next?.title ?? "");
    setChapterTextDraft(next?.paragraphs.join("\n\n") ?? "");
    setNotice(t("Đã xóa chương. Các chương còn lại đã được đánh lại số.", "Chapter deleted. The remaining chapters have been renumbered."));
  }

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>, asCover: boolean) {
    const input = event.currentTarget;
    const selectedFiles = Array.from(input.files ?? []);
    input.value = "";

    if (!selectedFiles.length || !selectedGarden || uploading) return;

    const maxPhotos = isAdmin ? 40 : CREATOR_MAX_PHOTOS;
    const remainingSlots = Math.max(0, maxPhotos - photos.length);
    if (remainingSlots === 0) {
      setError(isAdmin
        ? t("Album đã đạt giới hạn 40 ảnh cho tác phẩm này.", "This story album has reached its 40-photo limit.")
        : t("Tài khoản sáng tác có thể thêm tối đa 5 ảnh cho mỗi tác phẩm.", "Writer accounts can add up to 5 photos per story."));
      return;
    }

    const maxFileSize = (isAdmin ? 10 : 5) * 1024 * 1024;
    const validFiles: Array<{ file: File; mimeType: string; extension: string }> = [];
    const failures: string[] = [];

    for (const file of selectedFiles) {
      const mimeType = imageMimeType(file);
      if (!mimeType || file.size === 0) {
        failures.push(file.name + ": " + t("định dạng ảnh không được hỗ trợ.", "unsupported image format."));
        continue;
      }
      if (file.size > maxFileSize) {
        failures.push(file.name + ": " + t("vượt quá giới hạn ", "exceeds the ") + (isAdmin ? "10 MB." : "5 MB."));
        continue;
      }
      validFiles.push({ file, mimeType, extension: IMAGE_EXTENSION_BY_MIME[mimeType] });
    }

    const filesToUpload = validFiles.slice(0, asCover ? 1 : remainingSlots);
    if (!asCover && validFiles.length > filesToUpload.length) {
      failures.push(t("Một số ảnh không được thêm vì album đã gần đạt giới hạn.", "Some photos were skipped because the album is at its limit."));
    }
    if (asCover && validFiles.length > 1) {
      failures.push(t("Ảnh bìa chỉ nhận một tệp mỗi lần.", "Choose one cover image at a time."));
    }
    if (filesToUpload.length === 0) {
      setError(failures.join(" "));
      return;
    }

    setUploading(true);
    setError("");
    setNotice("");
    setUploadProgress("");

    let uploadedCount = 0;
    const storage = activeClientRef.current.storage.from("garden-photos");

    try {
      for (let index = 0; index < filesToUpload.length; index += 1) {
        const { file, mimeType, extension } = filesToUpload[index];
        setUploadProgress(
          t("Đang tải ", "Uploading ") +
          (index + 1) + "/" + filesToUpload.length + " · " + file.name
        );

        const path = selectedGarden.id + "/" + crypto.randomUUID() + "." + extension;
        const { data: uploadedFile, error: uploadError } = await storage.upload(path, file, {
          cacheControl: "3600",
          contentType: mimeType,
          upsert: false,
        });

        if (uploadError || !uploadedFile?.path) {
          console.error("Upload writing photo failed:", uploadError);
          failures.push(file.name + ": " + (uploadError?.message || t("Storage không trả về đường dẫn ảnh.", "Storage did not return an image path.")));
          continue;
        }

        const uploadedPath = uploadedFile.path;
        const { data: signedData, error: signedError } = await storage.createSignedUrl(uploadedPath, 60 * 60);
        if (signedError || !signedData?.signedUrl) {
          console.error("Create uploaded photo URL failed:", signedError);
          failures.push(file.name + ": " + (signedError?.message || t("Không tạo được liên kết xem ảnh.", "Could not create a view link for the photo.")));
          continue;
        }

        const newPhoto: GardenJournalPhoto = {
          path: uploadedPath,
          url: signedData.signedUrl,
          alt: file.name,
        };

        // Add the uploaded photo immediately instead of depending on a later Storage list call.
        setPhotos((current) => [newPhoto, ...current.filter((photo) => photo.path !== uploadedPath)]);
        uploadedCount += 1;

        if (asCover) {
          const { error: coverError } = await activeClientRef.current.from("gardens")
            .update({ cover_path: uploadedPath })
            .eq("id", selectedGarden.id)
            .eq("owner_id", selectedGarden.owner_id);

          if (coverError) {
            console.error("Set book cover failed:", coverError);
            failures.push(file.name + ": " + t("Ảnh đã tải lên và có trong album, nhưng chưa đặt được làm ảnh bìa: ", "The photo was uploaded and added to the album, but could not be set as the cover: ") + coverError.message);
          } else {
            setCoverPath(uploadedPath);
            setCoverUrl(signedData.signedUrl);
          }
        }
      }

      if (uploadedCount > 0) {
        setNotice(asCover
          ? t("Đã tải ảnh lên và cập nhật ảnh bìa.", "Photo uploaded and cover updated.")
          : t("Đã tải lên " + uploadedCount + " ảnh. Ảnh mới đã xuất hiện trong album.", uploadedCount + " photos uploaded. The new images are now in the album."));
      }
      if (failures.length > 0) setError(failures.slice(0, 4).join(" "));
    } catch (uploadFailure) {
      console.error("Unexpected writing photo upload failure:", uploadFailure);
      const detail = uploadFailure instanceof Error ? uploadFailure.message : String(uploadFailure);
      setError(t("Có lỗi khi tải ảnh lên: ", "An error occurred while uploading: ") + detail);
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  }

  async function reviewGuestbook(entry: GuestbookRow, status: "approved" | "rejected") {
    if (!selectedGarden || (!isAdmin && selectedGarden.owner_id !== userId)) return;
    const { error: updateError } = await activeClientRef.current.from("garden_guestbook").update({ status }).eq("id", entry.id);
    if (updateError) {
      setError(t("Chưa cập nhật được lời nhắn.", "Could not update the reader note."));
      return;
    }
    if (selectedGarden) {
      const { data, error } = await activeClientRef.current.from("garden_guestbook")
        .select("id,guest_name,message,status,created_at")
        .eq("garden_id", selectedGarden.id)
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) setError(t("Đã cập nhật trạng thái nhưng chưa tải lại được danh sách lời nhắn.", "Status updated, but the reader notes could not be reloaded."));
      else setGuestbook((data ?? []) as GuestbookRow[]);
    }
  }

  async function copyShareLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setNotice(t("Đã sao chép liên kết.", "Link copied."));
    } catch {
      setError(t("Trình duyệt không cho sao chép tự động. Bạn hãy chọn và sao chép đường link.", "Your browser blocked automatic copying. Select and copy the link manually."));
    }
  }

  async function submitForReview() {
    if (isAdmin || !selectedGarden || saving) return;
    if (!contentReady()) {
      setError(format === "message" ? t("Hãy viết nội dung thông điệp trước khi gửi duyệt.", "Write the message before submitting for review.")
        : format === "letter" ? t("Hãy viết nội dung bức thư trước khi gửi duyệt.", "Write the letter before submitting for review.")
        : t("Hãy thêm ít nhất một chương có nội dung trước khi gửi duyệt.", "Add at least one chapter with content before submitting for review."));
      return;
    }
    setSaving(true);
    setError("");
    const { error: submitError } = await activeClientRef.current.from("gardens")
      .update({ ...draftPayload(), approval_status: "pending" })
      .eq("id", selectedGarden.id).eq("owner_id", userId);
    if (submitError) {
      console.error("Submit story for review failed:", submitError);
      setError(t("Chưa gửi được tác phẩm cho Admin. Nội dung của bạn vẫn được giữ lại.", "Could not submit the story to Admin. Your work has been kept."));
      setSaving(false);
      return;
    }
    await loadGardens(userId, false);
    setNotice(t("Đã gửi tác phẩm cho Admin kiểm duyệt. Nội dung sẽ tạm khóa trong thời gian xem xét.", "Story submitted for Admin review. Editing is paused during review."));
    setSaving(false);
  }

  async function withdrawReview() {
    if (isAdmin || !selectedGarden || selectedGarden.approval_status !== "pending" || saving) return;
    setSaving(true);
    setError("");
    const { error: withdrawError } = await activeClientRef.current.from("gardens")
      .update({ approval_status: "draft" })
      .eq("id", selectedGarden.id).eq("owner_id", userId);
    if (withdrawError) {
      console.error("Withdraw story review failed:", withdrawError);
      setError(t("Chưa rút được yêu cầu duyệt. Bạn thử lại nhé.", "Could not withdraw the review request. Please try again."));
      setSaving(false);
      return;
    }
    await loadGardens(userId, false);
    setNotice(t("Đã rút yêu cầu duyệt. Bạn có thể tiếp tục chỉnh sửa bản thảo.", "Review request withdrawn. You can continue editing your draft."));
    setSaving(false);
  }

  const renderGardenItem = (garden: GardenRow) => {
    const canDeleteGarden = !garden.is_published && (
      isAdmin
      || (garden.owner_id === userId && (garden.approval_status === "draft" || garden.approval_status === "rejected"))
    );
    return (
      <div key={garden.id} className={styles.workRow}>
        <button type="button" className={garden.id === selectedId ? styles.workActive : styles.workButton} onClick={() => setSelectedId(garden.id)}>
          <span className={styles.workMark}>{garden.experience_settings?.storyFormat === "message" ? "✎" : garden.experience_settings?.storyFormat === "letter" ? "✉" : "▤"}</span>
          <span><strong>{garden.name}</strong><small>{garden.is_published ? t("Đã xuất bản", "Published") : garden.approval_status === "pending" ? t("Chờ Admin duyệt", "Awaiting Admin review") : garden.approval_status === "approved" ? t("Đã duyệt · Chưa xuất bản", "Approved · Not published") : garden.approval_status === "rejected" ? t("Cần chỉnh sửa", "Needs changes") : t("Bản nháp riêng tư", "Private draft")}</small></span>
        </button>
        {canDeleteGarden && (
          <button type="button" className={styles.deleteWorkButton} title={t("Xóa bản thảo", "Delete draft")}
            aria-label={t("Xóa bản thảo ", "Delete draft ") + garden.name} disabled={saving} onClick={() => void deleteWork(garden)}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5"/>
            </svg>
          </button>
        )}
        {isAdmin && (
          <button type="button" className={styles.editStoryButton}
            onClick={() => { setSelectedId(garden.id); document.getElementById("writing-editor")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
            {t("Mở chỉnh sửa", "Edit story")} ↗
          </button>
        )}
      </div>
    );
  };

  function markPreviewRead(id: string) {
    setPreviewReadIds((current) => current.includes(id) ? current : [...current, id]);
  }

  if (loading || !authReady) {
    return <main className={styles.loading}><span>✎</span><p>{t("Đang mở không gian sáng tác...", "Opening your writing studio...")}</p></main>;
  }
  if (!userId) {
    return <main className={styles.loading}><p>{error || t("Bạn cần đăng nhập để bắt đầu sáng tác.", "Sign in to start writing.")}</p><Link href="/login?next=%2Faccount">{t("Đăng nhập để sáng tác", "Sign in to write")}</Link><Link href="/">{t("Về trang chủ", "Back to home")}</Link></main>;
  }

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <Link href="/" className={styles.brand}><span>✎</span><strong>Little Story World <small>WRITING STUDIO</small></strong></Link>
        <nav aria-label={t("Điều hướng không gian sáng tác", "Writing studio navigation")}>
          <span className={styles.accountBadge} title={accountLabel}>
            <span className={styles.accountAvatar} aria-hidden="true">{accountInitials}</span>
            <span className={styles.accountText}>
              <strong>{accountLabel}</strong>
              <small>{isAdmin ? t("TÀI KHOẢN QUẢN TRỊ", "ADMIN ACCOUNT") : t("TÀI KHOẢN SÁNG TÁC", "WRITER ACCOUNT")}</small>
            </span>
          </span>
          {isAdmin ? (
            <>
              <Link href="/admin">{t("Tổng quan Admin", "Admin overview")}</Link>
              <Link href="/admin/review">{t("Bàn kiểm duyệt", "Review desk")}</Link>
            </>
          ) : (
            <Link href="/account">{t("Bàn sáng tác", "Writing desk")}</Link>
          )}
          {selectedGarden?.is_published && shareUrl && <a href={shareUrl} target="_blank" rel="noreferrer">{t("Mở bản người đọc", "Open reader view")} ↗</a>}
          <Link href="/">{t("Trang chủ", "Home")}</Link>
          <button type="button" onClick={() => void handleLogout()}>{isAdmin ? t("Thoát Admin", "Sign out Admin") : t("Đăng xuất", "Sign out")}</button>
        </nav>
      </header>

      <section className={styles.welcome}>
        <div className={styles.welcomeCopy}>
          <p className={styles.eyebrow}>{isAdmin ? "ADMIN WORKSPACE" : "BÀN SÁNG TÁC RIÊNG"}</p>
          <h1>{isAdmin ? t("Không gian chỉnh sửa đầy đủ của Admin.", "Full Admin editing workspace.") : t("Nơi bạn viết và chăm chút câu chuyện của mình.", "A quiet place to write and shape your stories.")}</h1>
          <p>{isAdmin
            ? t("Admin là chủ hệ thống: quản lý tác phẩm của mình, xem và chỉnh sửa tác phẩm của từng người dùng, duyệt hoặc từ chối tại Bàn kiểm duyệt. Người dùng có thể tự xuất bản sau khi được Admin duyệt.", "Admin is the system owner: manage personal stories, inspect and edit each User's stories, and approve or reject in the Review Desk. Users can publish their own stories after approval.")
            : t("Đây là bàn sáng tác dành cho người dùng: tạo tác phẩm, thêm ảnh, trang trí, gửi Admin kiểm duyệt và nhận thông báo. Khi được duyệt, Người dùng có thể tự xuất bản, đặt PIN và bật lời nhắn cho Khách đọc.", "This writing desk is for Users: create stories, add photos, decorate, submit for Admin review, and receive notices. Once approved, Users can publish, set a PIN, and enable notes from reader Guests.")}</p>
        </div>
        <div className={styles.welcomePhoto} role="img" aria-label={t("Cuốn sách mở dưới ánh sáng tự nhiên", "An open book in natural light")}>
          <span>YOUR WORDS, YOUR PAGES</span>
        </div>
      </section>

      {!isAdmin && (
        <section className={styles.accountCapabilities} aria-label={t("Chức năng tài khoản sáng tác", "Creator account features")}>
          <div><span>▤</span><strong>{t("Quản lý bản thảo", "Manage drafts")}</strong><small>{t("Tạo, sửa và xóa bản thảo riêng tư hoặc bản bị từ chối.", "Create, edit, and delete private or rejected drafts.")}</small></div>
          <div><span>▧</span><strong>{t("Quản lý hình ảnh", "Manage photos")}</strong><small>{t("Thêm ảnh và xem kho ảnh của từng tác phẩm.", "Add photos and manage each story's album.")}</small></div>
          <div><span>✉</span><strong>{t("Gửi Admin kiểm duyệt", "Submit for review")}</strong><small>{t("Theo dõi trạng thái và đọc nhận xét từ Admin.", "Track review status and read Admin feedback.")}</small></div>
          <div><span>✉</span><strong>{t("Admin duyệt · Người dùng xuất bản", "Admin approves · User publishes")}</strong><small>{t("Người dùng chỉ được tạo liên kết công khai sau khi Admin duyệt tác phẩm.", "Users can create a public link only after Admin approval.")}</small></div>
        </section>
      )}

      {error && <p className={styles.error} role="alert">{error}</p>}
      {notice && <p className={styles.notice} role="status">{notice}</p>}

      <div className={styles.workspace}>
        <aside className={styles.sidebar}>
          <div className={styles.sideHeader}>
            <div>
              <span className={styles.eyebrow}>{isAdmin ? t("KHO TÁC PHẨM · ADMIN LÀ CHỦ HỆ THỐNG", "STORY LIBRARY · ADMIN IS SYSTEM OWNER") : t("TÁC PHẨM CỦA TÔI", "MY STORIES")}</span>
              <h2>{isAdmin ? t("Quản lý tác phẩm", "Story management") : t("Bản thảo của bạn", "Your drafts")}</h2>
            </div>
            <button type="button" onClick={createWork} disabled={saving}>{isAdmin ? t("＋ Thêm tác phẩm", "＋ Add story") : t("＋ Tạo mới", "＋ New story")}</button>
          </div>
          {gardens.length === 0 ? <p className={styles.empty}>{t("Chưa có tác phẩm nào. Bắt đầu bằng một tác phẩm mới nhé.", "No stories yet. Start with a new story.")}</p> : (
            <div className={styles.storyCollections}>
              {!isAdmin ? (
                <section className={styles.storyCollection}>
                  <h3>{t("TÁC PHẨM CỦA TÔI", "MY STORIES")}</h3>
                  {gardens.map((garden) => renderGardenItem(garden))}
                </section>
              ) : (
                <>
                  <section className={styles.storyCollection}>
                    <h3>{t("TÁC PHẨM CỦA ADMIN · CHỦ HỆ THỐNG", "ADMIN'S STORIES · SYSTEM OWNER")}</h3>
                    {myAdminStories.length > 0 ? myAdminStories.map((garden) => renderGardenItem(garden)) : <p className={styles.collectionEmpty}>{t("Admin chưa có tác phẩm riêng.", "Admin has no personal stories yet.")}</p>}
                  </section>
                  <section className={styles.storyCollection}>
                    <h3>{t("TÁC PHẨM CỦA NGƯỜI DÙNG · TÀI KHOẢN NGƯỜI VIẾT", "USERS' STORIES · WRITER ACCOUNTS")}</h3>
                    {guestStoryGroups.length > 0 ? guestStoryGroups.map((group) => (
                      <div className={styles.ownerStoryGroup} key={group.ownerId}>
                        <div className={styles.ownerStoryHeading}>
                          <strong>{group.ownerName}</strong>
                          <small>{group.email || group.stories.length + " " + t("tác phẩm", "stories")}</small>
                        </div>
                        {group.stories.map((garden) => renderGardenItem(garden))}
                      </div>
                    )) : <p className={styles.collectionEmpty}>{t("Chưa có người dùng nào tạo tác phẩm.", "No writer accounts have created stories yet.")}</p>}
                  </section>
                </>
              )}
            </div>
          )}
          <div className={styles.sidebarNote}><strong>{t("Gợi ý nhỏ", "A small reminder")}</strong><p>{t("Một câu thật lòng luôn đáng nhớ hơn rất nhiều dòng chữ viết cho đủ.", "One sincere sentence is worth more than many empty words.")}</p></div>
        </aside>

        {selectedGarden ? (
          <section className={styles.editor} id="writing-editor">
            <div className={styles.editorHeading}>
              <div>
                <p className={styles.eyebrow}>{isAdmin && selectedGarden.owner_id !== FAIRYTALE_GARDEN_ADMIN_USER_ID ? t("ADMIN · ĐANG SỬA TÁC PHẨM CỦA NGƯỜI DÙNG", "ADMIN · EDITING A USER STORY") : isAdmin ? t("ADMIN · TÁC PHẨM CHỦ HỆ THỐNG", "ADMIN · SYSTEM OWNER STORY") : t("NGƯỜI DÙNG · BÀN SÁNG TÁC", "NGƯỜI DÙNG · BÀN SÁNG TÁC")}</p>
                <h2>{name || selectedGarden.name}</h2>
                {isAdmin && <small className={styles.selectedOwnerLabel}>{t("Chủ sở hữu: ", "Owner: ")}{selectedOwnerName}</small>}
              </div>
              <span className={selectedGarden.is_published ? styles.published : styles.draft}>{selectedGarden.is_published ? "Đang chia sẻ" : selectedGarden.approval_status === "pending" ? t("Đang chờ Admin duyệt", "Awaiting Admin review") : selectedGarden.approval_status === "approved" ? t("Đã duyệt · Chưa xuất bản", "Approved · Not published") : selectedGarden.approval_status === "rejected" ? "Cần chỉnh sửa và gửi lại" : t("Bản nháp riêng tư", "Private draft")}</span>
            </div>
            <nav className={styles.stepNav} aria-label={t("Các bước sáng tác", "Writing steps")}>
              <a href="#write-01">01 <span>{t("Chọn dạng", "Choose format")}</span></a>
              <a href="#write-02">02 <span>{t("Viết nội dung", "Write content")}</span></a>
              <a href="#write-03">03 <span>{t("Hình ảnh", "Photos")}</span></a>
              <a href="#write-04">04 <span>{t("Trang trí", "Decorate")}</span></a>
              <a href="#write-05">05 <span>{t("Lời nhắn", "Reader notes")}</span></a>
              <a href="#write-06">06 <span>{t("Xuất bản & chia sẻ", "Publish & share")}</span></a>
            </nav>

            {!isAdmin && selectedGarden.approval_status === "pending" && <p className={styles.notice} role="status">{t("Bản thảo đã được gửi Admin kiểm duyệt. Nội dung tạm khóa trong thời gian xem xét.", "Your draft was submitted for review. Editing is locked while Admin reviews it.")}</p>}
            {!isAdmin && (selectedGarden.approval_status === "approved" || selectedGarden.approval_status === "rejected") && (
              <aside className={styles.reviewNotification} data-state={selectedGarden.approval_status} role="status" aria-label={t("Thông báo kết quả kiểm duyệt", "Review decision notification")}>
                <div className={styles.reviewNotificationHeading}>
                  <span aria-hidden="true">{selectedGarden.approval_status === "approved" ? "✓" : "↺"}</span>
                  <strong>{selectedGarden.approval_status === "approved" ? t("Thông báo: Tác phẩm đã được duyệt", "Notice: Your story has been approved") : t("Thông báo: Tác phẩm chưa được duyệt", "Notice: Your story needs changes")}</strong>
                </div>
                <p>{selectedGarden.approval_status === "approved"
                  ? t("Admin đã duyệt tác phẩm. Bạn có thể xuất bản, bật lời nhắn người đọc và đặt mã PIN nếu muốn.", "Admin approved this story. You can publish it, enable reader notes, and set a PIN if you wish.")
                  : t("Admin chưa duyệt tác phẩm. Hãy xem lý do, chỉnh sửa bản thảo rồi gửi lại để được xem xét.", "Admin did not approve this story. Review the reason, edit your draft, and resubmit it.")}</p>
                {selectedGarden.review_comment && <blockquote>{selectedGarden.review_comment}</blockquote>}
                {selectedGarden.reviewed_at && <small>{t("Thời gian phản hồi: ", "Decision time: ")}{new Date(selectedGarden.reviewed_at).toLocaleString()}</small>}
                {selectedGarden.approval_status === "approved" && <button type="button" className={styles.secondaryButton} onClick={() => void startEditingApprovedStory()} disabled={saving}>
                  {saving ? t("Đang mở...", "Opening...") : t("✎ Mở chỉnh sửa tác phẩm", "✎ Reopen story for editing")}
                </button>}
              </aside>
            )}
            <fieldset className={styles.creatorFieldset} disabled={isCreatorReviewLocked}>
            <section className={styles.section} id="write-01">
              <div className={styles.sectionTitle}><span>01</span><div><h3>{t("Bạn muốn tạo điều gì?", "What would you like to create?")}</h3><p>{t("Chọn một kiểu phù hợp với điều bạn muốn gửi gắm. Nội dung cũ vẫn được giữ khi bạn đổi kiểu.", "Choose the format that suits your story. Your existing content stays when you switch formats.")}</p></div></div>
              <div className={styles.formatGrid}>
                {FORMATS.map((item) => (
                  <button key={item.value} type="button" className={format === item.value ? styles.formatActive : styles.formatCard}
                    aria-pressed={format === item.value} onClick={() => setFormat(item.value)}>
                    <span className={styles.formatMark}>{item.symbol}</span><strong>{t(item.title, item.titleEn)}</strong><small>{t(item.description, item.descriptionEn)}</small>
                    <span className={styles.formatCheck}>{format === item.value ? t("✓ Đang chọn", "✓ Selected") : t("Chọn kiểu này", "Choose this format")}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className={styles.section} id="write-02">
              <div className={styles.sectionTitle}><span>02</span><div><h3>Viết nội dung của bạn</h3><p>{t("Không cần căn chỉnh trang. Hệ thống tự trình bày thành trải nghiệm đọc sách.", "No need to format the page. Your words become a reading experience automatically.")}</p></div></div>
              <label className={styles.field}>{t("Tên tác phẩm", "Story title")}<input ref={storyNameInputRef} value={name} maxLength={80} onChange={(event) => setName(event.target.value)} placeholder={t("Ví dụ: Gửi người mình thương...", "For example: To someone dear...")}/></label>
              {renderWritingStickerPicker(storyNameInputRef, setName)}

              {format === "message" && (
                <div className={styles.writerPanel}>
                  <div className={styles.writerHeading}><span>✎</span><div><strong>{t("Thông điệp của bạn", "Your message")}</strong><small>{t("Một trang ngắn gọn và chân thành.", "A short and heartfelt page.")}</small></div></div>
                  <label className={styles.field}>{t("Nội dung thông điệp", "Message")}<textarea ref={messageTextareaRef} value={introduction} onChange={(event) => setIntroduction(event.target.value)} rows={10} maxLength={7000} placeholder={t("Bạn muốn nói điều gì với người nhận? Cứ viết tự nhiên như đang trò chuyện...", "What would you like to tell the reader? Write naturally, as if you were talking.")}/></label>
                  {renderWritingStickerPicker(messageTextareaRef, setIntroduction)}
                  <p className={styles.helper}>{t("Mỗi dòng trống sẽ tách thành một đoạn văn riêng.", "A blank line starts a new paragraph.")}</p>
                </div>
              )}

              {format === "letter" && (
                <div className={styles.writerPanel}>
                  <div className={styles.writerHeading}><span>✉</span><div><strong>{t("Bức thư của bạn", "Your letter")}</strong><small>{t("Một lá thư với lời mở đầu và chữ ký.", "A letter with an opening and a signature.")}</small></div></div>
                  <label className={styles.field}>{t("Lời dẫn ngắn", "Short introduction")}<input value={introduction} onChange={(event) => setIntroduction(event.target.value)} maxLength={300} placeholder={t("Một câu giới thiệu để người nhận mở thư...", "A sentence to introduce the letter...")}/></label>
                  <label className={styles.field}>{t("Tiêu đề thư", "Letter title")}<input value={letterTitle} maxLength={100} onChange={(event) => setLetterTitle(event.target.value)} placeholder="Gửi em, vào một ngày thật đẹp..."/></label>
                  <label className={styles.field}>{t("Nội dung thư", "Letter content")}<textarea ref={letterTextareaRef} value={letterText} onChange={(event) => setLetterText(event.target.value)} rows={12} maxLength={12000} placeholder={t("Bắt đầu viết bức thư của bạn tại đây...", "Start writing your letter here...")}/></label>
                  {renderWritingStickerPicker(letterTextareaRef, setLetterText)}
                  <label className={styles.field}>{t("Chữ ký", "Signature")}<input value={signature} maxLength={80} onChange={(event) => setSignature(event.target.value)} placeholder={t("Thân thương, ...", "With affection, ...")}/></label>
                </div>
              )}

              {format === "book" && (
                <div className={styles.writerPanel}>
                  <div className={styles.writerHeading}><span>▤</span><div><strong>{t("Cuốn sách của bạn", "Your book")}</strong><small>{t("Viết lời giới thiệu và thêm từng chương theo mạch truyện.", "Write an introduction and add chapters in the order of your story.")}</small></div></div>
                  <label className={styles.field}>{t("Lời giới thiệu", "Introduction")}<textarea ref={bookIntroTextareaRef} value={introduction} onChange={(event) => setIntroduction(event.target.value)} rows={3} maxLength={700} placeholder="Một vài dòng dẫn người đọc bước vào câu chuyện..."/></label>
                  {renderWritingStickerPicker(bookIntroTextareaRef, setIntroduction)}
                  <div className={styles.chapterWorkspace}>
                    <div className={styles.chapterPanel}>
                      <div className={styles.chapterPanelHeading}><strong>{t("Mục lục bản thảo", "Draft contents")}</strong><span>{chapters.length} chương</span></div>
                      {chapters.length === 0 ? <p className={styles.chapterEmpty}>{t("Chưa có chương. Bạn có thể viết chương đầu tiên ở bên cạnh.", "No chapters yet. Write the first one in the panel beside this.")}</p> : chapters.map((chapter, index) => (
                        <div className={styles.chapterItem} key={chapter.chapter_id}>
                          <button type="button" className={chapter.chapter_id === selectedChapterId ? styles.chapterActive : styles.chapterSelect} onClick={() => chooseChapter(chapter)}>
                            <span>{String(index + 1).padStart(2, "0")}</span><strong>{chapter.title}</strong>
                          </button>
                          <button type="button" className={styles.deleteChapter} onClick={() => void deleteChapter(chapter.chapter_id)} aria-label={t("Xóa chương", "Delete chapter") + " " + chapter.title}>×</button>
                        </div>
                      ))}
                    </div>
                    <div className={styles.chapterForm}>
                      {selectedChapter ? (
                        <>
                          <div className={styles.chapterFormHeading}><strong>{t("Chỉnh sửa chương", "Edit chapter")}</strong><span>Chương {selectedChapter.sort_order}</span></div>
                          <label className={styles.field}>{t("Tên chương", "Chapter title")}<input value={chapterTitleDraft} onChange={(event) => setChapterTitleDraft(event.target.value)} maxLength={120}/></label>
                          <label className={styles.field}>{t("Nội dung", "Content")}<textarea ref={chapterTextDraftRef} value={chapterTextDraft} onChange={(event) => setChapterTextDraft(event.target.value)} rows={8} maxLength={16000}/></label>
                          {renderWritingStickerPicker(chapterTextDraftRef, setChapterTextDraft)}
                          <button type="button" className={styles.secondaryButton} onClick={() => void saveChapter()} disabled={saving}>{saving ? t("Đang lưu...", "Saving...") : t("Lưu chương này", "Save chapter")}</button>
                        </>
                      ) : (
                        <>
                          <div className={styles.chapterFormHeading}><strong>{t("Viết chương đầu tiên", "Write the first chapter")}</strong><span>01</span></div>
                          <p className={styles.chapterEmpty}>{t("Mỗi chương trở thành một lượt lật trang trong cuốn sách.", "Each chapter becomes a page-turn in your book.")}</p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className={styles.addChapterPanel}>
                    <div className={styles.chapterFormHeading}><strong>{t("＋ Thêm chương mới", "＋ Add a chapter")}</strong><span>Chương {t("Chương", "Chapter")} {Math.max(0, ...chapters.map((chapter) => chapter.sort_order)) + 1}</span></div>
                    
                    <label className={styles.field}>{t("Tên chương", "Chapter title")}<input value={newChapterTitle} onChange={(event) => setNewChapterTitle(event.target.value)} maxLength={120} placeholder={t("Ví dụ: Ngày mình gặp nhau...", "For example: The day we met...")}/></label>
                    <label className={styles.field}>{t("Nội dung chương", "Chapter content")}<textarea ref={newChapterTextRef} value={newChapterText} onChange={(event) => setNewChapterText(event.target.value)} rows={6} maxLength={16000} placeholder={t("Viết nội dung chương tiếp theo...", "Write the next chapter...")}/></label>
                    {renderWritingStickerPicker(newChapterTextRef, setNewChapterText)}
                    <button type="button" className={styles.primaryButton} onClick={() => void addChapter()} disabled={saving || !newChapterTitle.trim()}>{saving ? t("Đang thêm...", "Adding...") : t("Thêm chương vào sách", "Add chapter")}</button>
                  </div>
                  <div className={styles.writerInset}>
                    <label className={styles.field}>{t("Tiêu đề lá thư cuối (không bắt buộc)", "Final letter title (optional)")}<input ref={finalLetterTitleInputRef} value={letterTitle} maxLength={100} onChange={(event) => setLetterTitle(event.target.value)}/></label>
                    {renderWritingStickerPicker(finalLetterTitleInputRef, setLetterTitle)}
                    <label className={styles.field}>{t("Nội dung lá thư cuối", "Final letter")}<textarea ref={finalLetterTextareaRef} value={letterText} onChange={(event) => setLetterText(event.target.value)} rows={4} maxLength={5000} placeholder={t("Có thể để dành một lời nhắn đặc biệt cho trang cuối...", "Save a special note for the final page...")}/></label>
                    {renderWritingStickerPicker(finalLetterTextareaRef, setLetterText)}
                    <label className={styles.field}>{t("Chữ ký", "Signature")}<input value={signature} maxLength={80} onChange={(event) => setSignature(event.target.value)} placeholder={t("Người viết", "Author")}/></label>
                    <p className={styles.helper}>{t("Lá thư cuối sẽ xuất hiện sau khi người đọc hoàn thành các chương.", "The final letter appears after the reader finishes the chapters.")}</p>
                  </div>
                </div>
              )}
            </section>

            <section className={styles.section} id="write-03">
              <div className={styles.sectionTitle}><span>03</span><div><h3>{t("Hình ảnh do bạn chọn", "Your photos")}</h3><p>{t("Ảnh bìa và ảnh kỷ niệm do bạn tải lên. Ảnh minh họa sách chỉ dùng làm nền giao diện khi chưa có ảnh bìa.", "Upload your own cover and memory photos. The sample book image is only a temporary background.")}</p></div></div>
              {coverUrl && <div className={styles.coverPreview}><Image src={coverUrl} alt={t("Ảnh bìa tác phẩm", "Story cover")} width={1600} height={1000} unoptimized/><span>{t("Ảnh bìa hiện tại", "Current story cover")}</span></div>}
              <div className={styles.uploadGrid}>
                <label className={styles.uploadCard}>
                  <strong>{t("＋ Tải ảnh bìa lên", "＋ Upload cover")}</strong>
                  <span className={styles.uploadAction}>{t("Chọn một ảnh từ thiết bị", "Choose one photo from your device")}</span>
                  <input className={styles.fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" onChange={(event) => void uploadPhoto(event, true)} disabled={uploading || photos.length >= (isAdmin ? 40 : CREATOR_MAX_PHOTOS)}/>
                  <small>JPG · PNG · WEBP · AVIF · GIF · {isAdmin ? t("tối đa 10 MB", "up to 10 MB") : t("tối đa 5 MB", "up to 5 MB")}</small>
                </label>
                <label className={styles.uploadCard}>
                  <strong>{t("＋ Thêm ảnh kỷ niệm", "＋ Add memory photos")}</strong>
                  <span className={styles.uploadAction}>{t("Chọn một hoặc nhiều ảnh", "Choose one or more photos")}</span>
                  <input className={styles.fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" multiple onChange={(event) => void uploadPhoto(event, false)} disabled={uploading || photos.length >= (isAdmin ? 40 : CREATOR_MAX_PHOTOS)}/>
                  <small>{isAdmin ? t("Tối đa 40 ảnh trong album", "Up to 40 photos per story") : t("Tối đa 5 ảnh trong mỗi tác phẩm", "Up to 5 photos per story")}</small>
                </label>
              </div>
              {uploading && <p className={styles.uploadProgress} role="status">{uploadProgress || t("Đang chuẩn bị ảnh...", "Preparing photos...")}</p>}
              {photos.length > 0 && <div className={styles.albumPreview}><strong>{photos.length} {t("ảnh đã có trong album", "photos in this album")}</strong><div>{photos.map((photo) => <figure key={photo.path}><Image src={photo.url} alt={photo.alt} width={480} height={320} sizes="(max-width: 680px) 42vw, (max-width: 1100px) 25vw, 180px" unoptimized loading="lazy"/><figcaption>{photo.alt}</figcaption></figure>)}</div></div>}
            </section>

            <section className={styles.section} id="write-04">
              <div className={styles.sectionTitle}><span>04</span><div><h3>{t("Trang trí câu chuyện", "Decorate your story")}</h3><p>{t("Chọn màu sắc, chất giấy, hiệu ứng và sticker. Tất cả được lưu cùng tác phẩm và xuất hiện khi người nhận mở sách.", "Choose colors, paper textures, effects, and stickers. Your choices are saved with the story and appear when readers open it.")}</p></div></div>
              <div className={styles.decoratorPanel}>
                <div className={styles.decoratorGroup}>
                  <div className={styles.decoratorHeading}><strong>{t("Chủ đề màu", "Color theme")}</strong><span>{t("Di chuột để xem minh họa · Bấm để chọn", "Hover for an illustration · Click to select")}</span></div>
                  <div className={styles.decorationThemes}>
                    {DECORATION_THEMES.map((item) => <button key={item.value} type="button" className={decorations.theme === item.value ? styles.decorationChoiceActive : styles.decorationChoice} onClick={() => setDecorations((current) => ({ ...current, theme: item.value }))}>
                      <span className={[styles.themeSwatch, styles["swatch" + item.value[0].toUpperCase() + item.value.slice(1)]].join(" ")}/>
                      <strong>{t(item.title, item.titleEn)}</strong><small>{t(item.detail, item.detailEn)}</small>
                      <span className={styles.hoverIllustration} data-kind={item.value} aria-hidden="true"><span>{item.value === "meadow" ? "🌼 🍃 🦋" : item.value === "sunset" ? "🌅 🌷 ☀️" : "🌙 ✨ ⭐"}</span><small>{t("Minh họa chủ đề", "Theme illustration")}</small></span>
                    </button>)}
                  </div>
                </div>
                <div className={styles.decoratorGroup}>
                  <div className={styles.decoratorHeading}><strong>{t("Bề mặt giấy", "Paper finish")}</strong><span>{t("Chọn cảm giác của từng trang", "Choose the feel of each page")}</span></div>
                  <div className={styles.decorationOptions}>
                    {PAPER_FINISHES.map((item) => <button key={item.value} type="button" className={decorations.paper === item.value ? styles.decorationPillActive : styles.decorationPill} onClick={() => setDecorations((current) => ({ ...current, paper: item.value }))}>
                      <strong>{t(item.title, item.titleEn)}</strong><small>{t(item.detail, item.detailEn)}</small>
                      <span className={styles.hoverIllustration} data-kind={item.value} aria-hidden="true"><span className={styles.paperArtwork}>📜</span><small>{item.value === "ivory" ? t("Bề mặt giấy ngà", "Ivory paper surface") : item.value === "linen" ? t("Vân giấy linen", "Linen paper texture") : t("Giấy hồng ấm áp", "Warm blush paper")}</small></span>
                    </button>)}
                  </div>
                </div>
                <div className={styles.decoratorGroup}>
                  <div className={styles.decoratorHeading}><strong>{t("Hiệu ứng khi đọc", "Reading effects")}</strong><span>{t("Người đọc có thể tắt chuyển động bằng cài đặt thiết bị", "Readers can reduce motion in their device settings")}</span></div>
                  <div className={styles.effectOptions}>
                    {PAGE_EFFECTS.map((item) => <button key={item.value} type="button" className={decorations.effect === item.value ? styles.effectChoiceActive : styles.effectChoice} onClick={() => setDecorations((current) => ({ ...current, effect: item.value }))}>
                      <strong>{t(item.title, item.titleEn)}</strong><small>{t(item.detail, item.detailEn)}</small>
                      <span className={styles.hoverIllustration} data-kind={item.value} aria-hidden="true"><span>{item.value === "page-turn" ? "📖 ↗" : item.value === "soft-glow" ? "📖 ✨" : item.value === "sparkles" ? "✦ ✧ ✨" : "📖"}</span><small>{t("Xem hiệu ứng đọc", "Reading effect preview")}</small></span>
                    </button>)}
                  </div>
                </div>
                <div className={styles.decoratorGroup}>
                  <div className={styles.decoratorHeading}><strong>{t("Sticker trang trí", "Decorative stickers")}</strong><span>{decorations.stickers.length} / {isAdmin ? STORY_STICKERS.length : CREATOR_MAX_STICKERS} {t("đã chọn", "selected")}</span></div>
                  <div className={styles.stickerPicker}>
                    {STORY_STICKERS.map((sticker) => {
                      const active = decorations.stickers.includes(sticker.id);
                      return <button key={sticker.id} type="button" className={active ? styles.stickerChoiceActive : styles.stickerChoice} onClick={() => toggleSticker(sticker.id)}>
                        <span>{sticker.emoji}</span><strong>{t(sticker.label, sticker.labelEn)}</strong>{active && <small>{t("✓ Đã thêm", "✓ Added")}</small>}
                      </button>;
                    })}
                  </div>
                  <p className={styles.helper}>{t("Admin và mọi tài khoản người dùng đều được dùng toàn bộ bộ sticker, không giới hạn số lượng.", "Admin and all User accounts can use the full sticker collection without a selection limit.")} {t("Sticker chỉ mang tính trang trí, không che nội dung trang.", "Stickers are decorative and will not cover your text.")}</p>
                </div>
                <div className={styles.decorationPreview}><span>{decorations.stickers.map((id) => STORY_STICKERS.find((item) => item.id === id)?.emoji).join(" ") || "✦"}</span><div><strong>{t("Xem nhanh phong cách", "Style preview")}</strong><p>{DECORATION_THEMES.find((item) => item.value === decorations.theme) ? t(DECORATION_THEMES.find((item) => item.value === decorations.theme)!.title, DECORATION_THEMES.find((item) => item.value === decorations.theme)!.titleEn) : ""} · {PAPER_FINISHES.find((item) => item.value === decorations.paper) ? t(PAPER_FINISHES.find((item) => item.value === decorations.paper)!.title, PAPER_FINISHES.find((item) => item.value === decorations.paper)!.titleEn) : ""} · {PAGE_EFFECTS.find((item) => item.value === decorations.effect) ? t(PAGE_EFFECTS.find((item) => item.value === decorations.effect)!.title, PAGE_EFFECTS.find((item) => item.value === decorations.effect)!.titleEn) : ""}</p></div></div>
              </div>
            </section>

            </fieldset>
            <section className={styles.section} id="write-05">
              <div className={styles.sectionTitle}><span>05</span><div><h3>{t("Lời nhắn từ người đọc", "Reader notes")}</h3><p>{isAdmin
                ? t("Admin là chủ hệ thống và có thể kiểm duyệt lời nhắn trên tất cả tác phẩm.", "Admin is the system owner and can moderate notes on every story.")
                : t("Khách chỉ đọc và gửi lời nhắn. Bạn duyệt hoặc ẩn lời nhắn trên tác phẩm của chính mình.", "Guests can only read and send notes. You can approve or hide notes on your own story.")}</p></div></div>
              {selectedGarden.approval_status === "approved" ? (
                <>
                  <label className={styles.toggle}><input type="checkbox" checked={guestbookEnabled} onChange={(event) => setGuestbookEnabled(event.target.checked)}/> {t("Cho phép người đọc để lại lời nhắn", "Allow readers to leave notes")}</label>
                  {!isAdmin && <>
                    <label className={styles.toggle}><input type="checkbox" checked={pinEnabled} onChange={(event) => setPinEnabled(event.target.checked)}/> {t("Đặt mã PIN riêng cho người nhận (không bắt buộc)", "Set an optional PIN for readers")}</label>
                    {pinEnabled && <label className={styles.field}>{t("Mã PIN · tối thiểu 6 ký tự", "PIN · at least 6 characters")}<input type="password" value={pinDraft} onChange={(event) => setPinDraft(event.target.value)} placeholder={pinExists ? t("Để trống để giữ mã PIN hiện tại", "Leave blank to keep the current PIN") : t("Tạo mã PIN cho người đọc", "Create a PIN for readers")}/></label>}
                    <div className={styles.readerSettingsActions}>
                      <p className={styles.helper}>{t("PIN chỉ bảo vệ liên kết người đọc. Admin vẫn có quyền quản trị toàn bộ tác phẩm và lời nhắn.", "The PIN only protects the reader link. Admin retains system-wide control of stories and notes.")}</p>
                      <button type="button" className={styles.secondaryButton} onClick={() => void saveApprovedReaderSettings()} disabled={saving}>{saving ? t("Đang lưu...", "Saving...") : t("Lưu cài đặt người đọc", "Save reader settings")}</button>
                    </div>
                  </>}
                  {isAdmin && <p className={styles.helper}>{t("Thay đổi cài đặt lưu bút sẽ được lưu cùng lần cập nhật nội dung hoặc xuất bản.", "Reader-note settings are saved with the next content update or publishing action.")}</p>}
                </>
              ) : (
                <p className={styles.chapterEmpty}>{t("Cài đặt lời nhắn và mã PIN chỉ thay đổi được khi tác phẩm đã được Admin duyệt. Các lời nhắn cũ vẫn có thể được duyệt hoặc ẩn.", "Reader-note and PIN settings can be changed after Admin approval. Existing notes can still be approved or hidden.")}</p>
              )}
              <div className={styles.guestStats}><span>{pendingCount} {t("chờ duyệt", "pending")}</span><span>{approvedCount} {t("đã duyệt", "approved")}</span></div>
              {guestbook.map((entry) => <div className={styles.guestEntry} key={entry.id}>
                <div><strong>{entry.guest_name}</strong><small>{new Date(entry.created_at).toLocaleString("vi-VN")}</small><p>{entry.message}</p></div>
                <span className={styles.guestStatus}>{entry.status === "pending" ? t("Chờ duyệt", "Pending") : entry.status === "approved" ? t("Đã duyệt", "Approved") : t("Đã ẩn", "Hidden")}</span>
                {entry.status !== "approved" && <button type="button" onClick={() => void reviewGuestbook(entry, "approved")}>{t("Duyệt", "Approve")}</button>}
                {entry.status !== "rejected" && <button type="button" className={styles.textDanger} onClick={() => void reviewGuestbook(entry, "rejected")}>{t("Ẩn", "Hide")}</button>}
              </div>)}
              {guestbook.length === 0 && <p className={styles.chapterEmpty}>{t("Chưa có lời nhắn nào.", "No reader notes yet.")}</p>}
            </section>

            <section className={styles.section} id="write-06">
              <div className={styles.sectionTitle}><span>{isAdmin ? "06" : "05"}</span><div><h3>{t("Xem trước và gửi tác phẩm", "Preview and submit")}</h3><p>{t("Kiểm tra trải nghiệm lật trang, mục lục và hình ảnh trước khi gửi.", "Check page turns, contents, and photos before submitting.")}</p></div></div>
              <div className={styles.actionCard}><div><strong>{t("Bản xem trước", "Preview")}</strong><p>{t("Mở thử tác phẩm như người nhận sẽ thấy.", "Open the story as the reader will see it.")}</p></div><button type="button" className={styles.secondaryButton} onClick={() => { setPreviewReadIds([]); setPreviewOpen(true); }}>{t("◉ Xem trước", "◉ Preview")}</button></div>
              <div className={styles.actionCard}><div><strong>{t("Lưu riêng tư", "Save privately")}</strong><p>{t("Lưu nội dung hiện tại mà không tạo link công khai.", "Save your current work without publishing a public link.")}</p></div><button type="button" className={styles.primaryButton} onClick={() => void saveDraft()} disabled={saving || isCreatorReviewLocked}>{saving ? t("Đang lưu...", "Saving...") : t("Lưu bản nháp", "Save draft")}</button></div>
              <div className={styles.publishPanel}>
                <div className={styles.publishHeading}><span>✉</span><div><strong>{isAdmin ? t("Quản lý xuất bản", "Publishing management") : t("Kiểm duyệt và xuất bản", "Review and publish")}</strong><p>{selectedGarden.approval_status === "approved"
                  ? t("Admin đã duyệt. Chủ sở hữu tác phẩm có thể xuất bản và chia sẻ khi sẵn sàng.", "Admin approved this story. Its owner can publish and share it when ready.")
                  : isAdmin && selectedGarden.owner_id === FAIRYTALE_GARDEN_ADMIN_USER_ID
                    ? t("Tác phẩm của Admin có thể xuất bản trực tiếp. Khi xuất bản, hệ thống sẽ đánh dấu đã duyệt.", "Admin-owned stories can be published directly and will be marked approved.")
                    : t("Tác phẩm phải được Admin duyệt trước khi có thể xuất bản.", "A story must be approved by Admin before it can be published.")}</p></div></div>
                <div className={styles.actionCard}><div><strong>{t("Trạng thái hiện tại", "Current status")}</strong><p>{selectedGarden.is_published ? t("Đang công khai", "Published") : selectedGarden.approval_status === "approved" ? t("Đã duyệt · Chưa xuất bản", "Approved · Not published") : selectedGarden.approval_status === "pending" ? t("Đang chờ Admin duyệt", "Awaiting Admin review") : selectedGarden.approval_status === "rejected" ? t("Chưa được duyệt · Cần chỉnh sửa", "Not approved · Changes needed") : t("Bản nháp riêng tư", "Private draft")}</p></div></div>
                {(selectedGarden.approval_status === "approved" || (isAdmin && selectedGarden.owner_id === FAIRYTALE_GARDEN_ADMIN_USER_ID)) && (
                  <>
                    <label className={styles.toggle}><input type="checkbox" checked={guestbookEnabled} onChange={(event) => setGuestbookEnabled(event.target.checked)}/> {t("Cho phép người đọc để lại lời nhắn", "Allow readers to leave notes")}</label>
                    <label className={styles.toggle}><input type="checkbox" checked={pinEnabled} onChange={(event) => setPinEnabled(event.target.checked)}/> {t("Đặt mã PIN riêng cho người nhận (không bắt buộc)", "Set an optional PIN for readers")}</label>
                    {pinEnabled && <label className={styles.field}>{t("Mã PIN · tối thiểu 6 ký tự", "PIN · at least 6 characters")}<input type="password" value={pinDraft} onChange={(event) => setPinDraft(event.target.value)} placeholder={pinExists ? t("Để trống để giữ mã PIN hiện tại", "Leave blank to keep the current PIN") : t("Tạo mã PIN cho người nhận", "Create a reader PIN")}/></label>}
                    <button type="button" className={selectedGarden.is_published ? styles.unpublishButton : styles.publishButton} onClick={() => void publishWork(!selectedGarden.is_published)} disabled={saving || (!selectedGarden.is_published && !contentReady())}>
                      {saving ? t("Đang cập nhật...", "Updating...") : selectedGarden.is_published ? t("Gỡ xuất bản", "Unpublish") : t("Xuất bản và tạo liên kết", "Publish and create link")}
                    </button>
                    {selectedGarden.is_published && shareUrl && <div className={styles.shareResult}>
                      <div className={styles.shareLinkBlock}><strong>{t("Liên kết tác phẩm", "Story link")}</strong><code>{shareUrl}</code><div><button type="button" onClick={() => void copyShareLink()}>{t("Sao chép link", "Copy link")}</button><a href={shareUrl} target="_blank" rel="noreferrer">Mở trang người đọc ↗</a></div><small>{pinExists ? t("Người nhận cần nhập mã PIN.", "Readers need a PIN.") : t("Người nhận có thể mở trực tiếp.", "Readers can open this link directly.")}</small></div>
                      <div className={styles.qrCode} role="img" aria-label={t("Mã QR để mở tác phẩm", "Story QR code")} style={{ backgroundImage: "url(" + qrUrl + ")" }}/>
                    </div>}
                  </>
                )}
                {selectedGarden.approval_status === "pending" && !isAdmin && <button type="button" className={styles.secondaryButton} onClick={() => void withdrawReview()} disabled={saving}>{t("Rút yêu cầu duyệt", "Withdraw review request")}</button>}
                {selectedGarden.approval_status !== "approved" && isAdmin && <Link className={styles.secondaryButton} href="/admin/review">{t("Mở Bàn kiểm duyệt", "Open review desk")} ↗</Link>}
                {selectedGarden.approval_status === "rejected" && !isAdmin && <button type="button" className={styles.primaryButton} onClick={() => void submitForReview()} disabled={saving || !contentReady()}>{saving ? t("Đang gửi...", "Submitting...") : t("Gửi duyệt lại", "Resubmit for review")}</button>}
                {selectedGarden.approval_status === "draft" && !isAdmin && <button type="button" className={styles.primaryButton} onClick={() => void submitForReview()} disabled={saving || !contentReady()}>{saving ? t("Đang gửi...", "Submitting...") : t("Gửi Admin kiểm duyệt", "Submit for Admin review")}</button>}
                {selectedGarden.approval_status === "pending" && isAdmin && <p className={styles.helper}>{t("Admin đang theo dõi yêu cầu này trong Bàn kiểm duyệt. Hãy dùng trang đó để duyệt hoặc từ chối.", "Use the Review Desk to approve or reject this pending request.")}</p>}
                {selectedGarden.approval_status === "rejected" && isAdmin && <p className={styles.helper}>{t("Người dùng đã nhận thông báo và lý do từ chối. Mở Bàn kiểm duyệt để xem quyết định.", "The User received the rejection notice and reason. Open the Review Desk to review the decision.")}</p>}
              </div>
              </section>
            </section>
        ) : (
          <section className={styles.emptyEditor}><span>✎</span><h2>{t("Một trang giấy đang chờ bạn.", "A blank page is waiting for you.")}</h2><p>{t("Tạo bản thảo đầu tiên và chọn cách kể chuyện mình thích.", "Create your first draft and choose how to tell your story.")}</p><button type="button" onClick={createWork} disabled={saving}>{t("＋ Bắt đầu viết", "＋ Start writing")}</button></section>
        )}
      </div>

      <dialog ref={previewRef}
        className={selectedGarden?.experience_settings?.readOnlyStandalone === true
          ? styles.previewDialog + " " + styles.previewDialogLetter
          : styles.previewDialog}
        onClose={() => setPreviewOpen(false)}
        onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }} aria-label={t("Bản xem trước tác phẩm", "Story preview")}>
        {selectedGarden && <>
          <header className={styles.previewHeader}><div><p className={styles.eyebrow}>{t("BẢN XEM TRƯỚC · CHỈ BẠN NHÌN THẤY", "PREVIEW · ONLY YOU CAN SEE THIS")}</p><h2>{name || selectedGarden.name}</h2></div><button type="button" onClick={closePreview} aria-label={t("Đóng bản xem trước", "Close preview")}>Đóng ✕</button></header>
          <div className={styles.previewBody}>
            {selectedGarden.experience_settings?.readOnlyStandalone === true ? (
              <FamilyLetterReader
                name={name || selectedGarden.name}
                introduction={introduction}
                chapters={journalChapters}
                photos={photos}
                letterTitle={letterTitle}
                letterParagraphs={splitText(letterText)}
                letterSignature={signature}
                embedded
              />
            ) : (
              <GardenJournal key={selectedGarden.id + "-" + format} name={name || selectedGarden.name} introduction={introduction} format={format}
                coverUrl={coverUrl} coverPath={coverPath} photos={photos} chapters={journalChapters} readIds={previewReadIds}
                decorations={decorations} onOpenChapter={markPreviewRead} letterTitle={letterTitle} letterParagraphs={splitText(letterText)}
                letterSignature={signature} letterReady={chapters.length > 0 && chapters.every((chapter) => previewReadIds.includes(chapter.chapter_id))}
                embedded returnHref="/" returnLabel="Little Story World" actionHref="#the-book"
                actionLabel={format === "book" ? "MỞ CUỐN SÁCH" : format === "letter" ? "ĐỌC BỨC THƯ" : "ĐỌC THÔNG ĐIỆP"}>
                {guestbookEnabled && <section className={styles.previewGuestbook}><h3>{t("Lời nhắn từ người đọc", "Reader notes")}</h3><p>{t("Biểu mẫu gửi lời nhắn sẽ xuất hiện sau khi tác phẩm được xuất bản.", "The reader note form appears after this story is published.")}</p></section>}
              </GardenJournal>
            )}
          </div>
        </>}
      </dialog>
    </main>
  );
}
