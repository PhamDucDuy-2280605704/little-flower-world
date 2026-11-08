"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import GardenJournal, { type GardenJournalPhoto, type JournalChapter, type StoryFormat } from "@/features/garden/components/GardenJournal";
import { adminSupabase } from "@/lib/adminSupabase";
import { supabase } from "@/lib/supabase";
import { FAIRYTALE_GARDEN_ADMIN_USER_ID } from "@/features/garden/data/gardenThemes";
import styles from "../styles/BookStudio.module.css";

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
  created_at: string;
};
type ChapterRow = { chapter_id: string; sort_order: number; title: string; paragraphs: string[] };
type GuestbookRow = { id: string; guest_name: string; message: string; status: "pending" | "approved" | "rejected"; created_at: string };
const FORMATS: Array<{ value: StoryFormat; title: string; description: string; symbol: string }> = [
  { value: "message", title: "Thông điệp", description: "Một trang ngắn để gửi điều bạn đang nghĩ.", symbol: "✎" },
  { value: "letter", title: "Bức thư", description: "Một lá thư riêng với lời mở đầu và chữ ký.", symbol: "✉" },
  { value: "book", title: "Cuốn sách", description: "Nhiều chương, mục lục và trải nghiệm lật trang.", symbol: "▤" },
];
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);
const CREATOR_MAX_CHAPTERS = 8;
const CREATOR_MAX_PHOTOS = 5;

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

export default function BookStudio() {
  const router = useRouter();
  const previewRef = useRef<HTMLDialogElement>(null);
  const [authReady, setAuthReady] = useState(false);
  const [userId, setUserId] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const activeClientRef = useRef(supabase);
  const [gardens, setGardens] = useState<GardenRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [photos, setPhotos] = useState<GardenJournalPhoto[]>([]);
  const [guestbook, setGuestbook] = useState<GuestbookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewReadIds, setPreviewReadIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [format, setFormat] = useState<StoryFormat>("book");
  const [name, setName] = useState("");
  const [introduction, setIntroduction] = useState("");
  const [letterTitle, setLetterTitle] = useState("Một lá thư dành riêng cho bạn");
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
      .select("id,owner_id,name,introduction,letter_title,letter_paragraphs,letter_signature,share_slug,is_published,published_at,cover_path,experience_settings,guestbook_enabled,approval_status,created_at")
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
    if (isAdmin) {
      const [secretResult, guestbookResult] = await Promise.all([
        activeClientRef.current.from("garden_share_secrets").select("garden_id").eq("garden_id", garden.id).maybeSingle(),
        activeClientRef.current.from("garden_guestbook").select("id,guest_name,message,status,created_at")
          .eq("garden_id", garden.id).order("created_at", { ascending: false }).limit(60),
      ]);
      if (secretResult.error) throw secretResult.error;
      if (guestbookResult.error) throw guestbookResult.error;
      hasPin = Boolean(secretResult.data);
      guestbookRows = (guestbookResult.data ?? []) as GuestbookRow[];
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
    setName(garden.name);
    setIntroduction(garden.introduction ?? "");
    setLetterTitle(garden.letter_title || "Một lá thư dành riêng cho bạn");
    setLetterText(paragraphs(garden.letter_paragraphs).join("\n\n"));
    setSignature(garden.letter_signature ?? "");
    setGuestbookEnabled(isAdmin && garden.guestbook_enabled === true);
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
      console.warn("Load story album failed:", albumError);
      setPhotos([]);
      return;
    }
    const imageFiles = (files ?? []).filter((file) => file.name && file.id && IMAGE_TYPES.has(file.metadata?.mimetype ?? ""));
    const signed = await Promise.all(imageFiles.map(async (file) => {
      const path = garden.id + "/" + file.name;
      const { data } = await activeClientRef.current.storage.from("garden-photos").createSignedUrl(path, 60 * 60);
      return data?.signedUrl ? { path, url: data.signedUrl, alt: "Ảnh trong tác phẩm" } : null;
    }));
    setPhotos(signed.filter((photo): photo is GardenJournalPhoto => photo !== null));
  }, [isAdmin]);

  useEffect(() => {
    let active = true;
    void Promise.all([adminSupabase.auth.getSession(), supabase.auth.getSession()]).then(async ([adminResult, memberResult]) => {
      if (!active) return;
      const adminUser = adminResult.data.session?.user ?? null;
      const memberUser = memberResult.data.session?.user ?? null;
      const forceAdminWorkspace = new URLSearchParams(window.location.search).get("mode") === "admin";
      const useAdminSession = adminUser?.id === FAIRYTALE_GARDEN_ADMIN_USER_ID && (forceAdminWorkspace || !memberUser);
      const user = useAdminSession ? adminUser : memberUser ?? adminUser;
      if (!user) {
        router.replace("/login?next=%2Fstudio");
        setAuthReady(true);
        setLoading(false);
        return;
      }
      const adminMode = user.id === FAIRYTALE_GARDEN_ADMIN_USER_ID;
      activeClientRef.current = useAdminSession ? adminSupabase : memberUser ? supabase : adminSupabase;
      setIsAdmin(adminMode);
      setUserId(user.id);
      try {
        await loadGardens(user.id, adminMode);
      } catch (loadError) {
        console.error("Load writing desk failed:", loadError);
        if (active) setError("Chưa tải được dbạn sách bản thảo. Bạn thử tải lại nhé.");
      } finally {
        if (active) { setAuthReady(true); setLoading(false); }
      }
    }).catch((sessionError: unknown) => {
      console.error("Writing desk auth failed:", sessionError);
      if (active) {
        setError("Không thể xác minh phiên đăng nhập.");
        setAuthReady(true);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [loadGardens, router]);

  useEffect(() => {
    if (!selectedGarden) return;
    let active = true;
    // Synchronize the selected draft with the editor fields.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadWork(selectedGarden).catch((loadError) => {
      console.error("Load selected writing failed:", loadError);
      if (active) setError("Chưa tải được nội dung tác phẩm.");
    });
    return () => { active = false; };
  }, [selectedGarden, loadWork]);

  useEffect(() => {
    const dialog = previewRef.current;
    if (!dialog) return;
    if (previewOpen && !dialog.open) dialog.showModal();
    if (!previewOpen && dialog.open) dialog.close();
  }, [previewOpen]);

  function splitText(value: string) {
    return value.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  }

  function draftPayload() {
    const content = {
      name: name.trim() || "Tác phẩm chưa đặt tên",
      introduction: introduction.trim(),
      letter_title: letterTitle.trim() || "Một lá thư dành riêng cho bạn",
      letter_paragraphs: splitText(letterText),
      letter_signature: signature.trim(),
      experience_settings: { ...(selectedGarden?.experience_settings ?? {}), storyFormat: format },
    };
    return isAdmin ? { ...content, guestbook_enabled: guestbookEnabled } : content;
  }

  function contentReady() {
    if (!name.trim()) return false;
    if (format === "message") return introduction.trim().length > 0;
    if (format === "letter") return letterText.trim().length > 0;
    return chapters.length > 0 && chapters.some((chapter) => chapter.paragraphs.join("\n").trim().length > 0);
  }

  async function syncPin(): Promise<boolean> {
    if (!isAdmin) return true;
    if (!selectedGarden) return false;
    if (!pinEnabled && pinExists) {
      const { error: deleteError } = await activeClientRef.current.from("garden_share_secrets").delete().eq("garden_id", selectedGarden.id);
      if (deleteError) {
        setError("Nội dung đã lưu nhưng chưa gỡ được mã PIN cũ.");
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
        setError("Nội dung đã lưu nhưng chưa cập nhật được mã PIN.");
        return false;
      }
      setPinExists(true);
      setPinDraft("");
    }
    return true;
  }

  async function saveDraft() {
    if (!selectedGarden || saving) return;
    if (isCreatorReviewLocked) {
      setNotice(selectedGarden.approval_status === "pending" ? "Tác phẩm đang chờ Admin duyệt nên tạm khóa chỉnh sửa." : "Tác phẩm đã được duyệt. Hãy liên hệ Admin nếu cần chỉnh sửa.");
      return;
    }
    if (pinEnabled && !pinExists && pinDraft.trim().length < 6) {
      setError("Mã PIN cần ít nhất 6 ký tự.");
      return;
    }
    if (pinEnabled && pinDraft.trim() && pinDraft.trim().length < 6) {
      setError("Mã PIN cần ít nhất 6 ký tự.");
      return;
    }
    setSaving(true);
    setError("");
    const savePayload = isAdmin ? draftPayload() : { ...draftPayload(), approval_status: "draft" as const };
    const { error: saveError } = await activeClientRef.current.from("gardens").update(savePayload).eq("id", selectedGarden.id).eq("owner_id", isAdmin ? selectedGarden.owner_id : userId);
    if (saveError) {
      console.error("Save draft failed:", saveError);
      setError("Chưa lưu được bản thảo.");
      setSaving(false);
      return;
    }
    if (!(await syncPin())) { setSaving(false); return; }
    await loadGardens(userId, isAdmin);
    setNotice("Đã lưu bản thảo.");
    setSaving(false);
  }

  async function publishWork(publish: boolean) {
    if (!isAdmin || !selectedGarden || saving) return;
    if (publish && selectedGarden.approval_status !== "approved") {
      setError("Admin cần duyệt tác phẩm trước khi xuất bản.");
      return;
    }
    if (publish && !contentReady()) {
      setError(format === "message" ? "Bạn cần viết nội dung thông điệp trước khi xuất bản."
        : format === "letter" ? "Bạn cần viết nội dung bức thư trước khi xuất bản."
        : "Bạn cần tạo ít nhất một chương có nội dung trước khi xuất bản.");
      return;
    }
    if (pinEnabled && !pinExists && pinDraft.trim().length < 6) {
      setError("Mã PIN cần ít nhất 6 ký tự trước khi xuất bản.");
      return;
    }
    if (pinEnabled && pinDraft.trim() && pinDraft.trim().length < 6) {
      setError("Mã PIN cần ít nhất 6 ký tự.");
      return;
    }
    setSaving(true);
    setError("");
    const { error: saveError } = await activeClientRef.current.from("gardens").update(draftPayload()).eq("id", selectedGarden.id);
    if (saveError) {
      setError("Chưa lưu được nội dung trước khi xuất bản.");
      setSaving(false);
      return;
    }
    if (!(await syncPin())) { setSaving(false); return; }
    const slug = selectedGarden.share_slug || slugFor(name || selectedGarden.name);
    const { error: publishError } = await activeClientRef.current.from("gardens").update({
      share_slug: slug,
      is_published: publish,
      published_at: publish ? selectedGarden.published_at || new Date().toISOString() : null,
    }).eq("id", selectedGarden.id);
    if (publishError) {
      console.error("Publish work failed:", publishError);
      setError("Đã lưu nội dung nhưng chưa thay đổi được trạng thái xuất bản.");
      setSaving(false);
      return;
    }
    await loadGardens(userId);
    setNotice(publish ? "Tác phẩm đã xuất bản. Bạn có thể gửi liên kết cho người nhận." : "Tác phẩm đã chuyển về bản nháp.");
    setSaving(false);
  }

  async function handleLogout() {
    const { error: logoutError } = await activeClientRef.current.auth.signOut({ scope: "local" });
    if (logoutError) {
      setError("Đăng xuất chưa thành công. Bạn thử lại nhé.");
      return;
    }
    router.replace(isAdmin ? "/admin/login" : "/login");
    router.refresh();
  }

  async function createWork() {
    if (!userId || saving) return;
    setSaving(true);
    setError("");
    const { data, error: createError } = await activeClientRef.current.from("gardens").insert({
      owner_id: userId,
      name: "Tác phẩm mới",
      introduction: "",
      letter_title: "Một lá thư dành riêng cho bạn",
      letter_paragraphs: [],
      letter_signature: "",
      experience_settings: { storyFormat: "book" },
      guestbook_enabled: false,
    }).select("id").single();
    if (createError || !data) {
      console.error("Create writing failed:", createError);
      setError("Chưa tạo được bản thảo mới.");
      setSaving(false);
      return;
    }
    await loadGardens(userId, isAdmin);
    setSelectedId(data.id);
    setNotice("Đã tạo bản thảo mới. Chọn kiểu tác phẩm rồi bắt đầu viết nhé.");
    setSaving(false);
  }

  async function addChapter() {
    if (!selectedGarden || saving || !newChapterTitle.trim()) return;
    if (!isAdmin && chapters.length >= CREATOR_MAX_CHAPTERS) {
      setError("Tài khoản sáng tác có thể thêm tối đa 8 chương cho mỗi cuốn sách.");
      return;
    }
    const content = splitText(newChapterText);
    if (content.length === 0) {
      setError("Bạn hãy viết nội dung chương trước khi thêm nhé.");
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
      setError("Chưa thêm được chương. Nội dung trong biểu mẫu vẫn được giữ.");
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
    setNotice("Đã thêm chương " + order + ".");
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
      setError("Chương cần có nội dung trước khi lưu.");
      return;
    }
    setSaving(true);
    const { error: updateError } = await activeClientRef.current.from("garden_chapters").update({
      title: chapterTitleDraft.trim(), paragraphs: content,
    }).eq("garden_id", selectedGarden.id).eq("chapter_id", selectedChapter.chapter_id);
    if (updateError) {
      console.error("Save chapter failed:", updateError);
      setError("Chưa lưu được chương.");
      setSaving(false);
      return;
    }
    setChapters((current) => current.map((chapter) => chapter.chapter_id === selectedChapter.chapter_id
      ? { ...chapter, title: chapterTitleDraft.trim(), paragraphs: content }
      : chapter));
    setNotice("Đã lưu nội dung chương.");
    setSaving(false);
  }

  async function deleteChapter(id: string) {
    if (!selectedGarden || saving) return;
    const chapter = chapters.find((item) => item.chapter_id === id);
    if (!window.confirm("Xóa chương “" + (chapter?.title ?? "") + "”? Nội dung sẽ không thể khôi phục.")) return;
    const { error: deleteError } = await activeClientRef.current.from("garden_chapters").delete()
      .eq("garden_id", selectedGarden.id).eq("chapter_id", id);
    if (deleteError) {
      setError("Chưa xóa được chương.");
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
    setNotice("Đã xóa chương. Các chương còn lại đã được đánh lại số.");
  }

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>, asCover: boolean) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selectedGarden || uploading) return;
    if (!isAdmin && photos.length >= CREATOR_MAX_PHOTOS) {
      setError("Tài khoản sáng tác có thể thêm tối đa 5 ảnh cho mỗi tác phẩm.");
      return;
    }
    const maxFileSize = (isAdmin ? 10 : 5) * 1024 * 1024;
    if (!IMAGE_TYPES.has(file.type) || file.size > maxFileSize) {
      setError(isAdmin ? "Chọn ảnh JPG, PNG, WEBP, AVIF hoặc GIF tối đa 10 MB nhé." : "Ảnh dành cho tài khoản sáng tác có dung lượng tối đa 5 MB.");
      return;
    }
    setUploading(true);
    setError("");
    const extension = file.name.split(".").pop()?.toLowerCase() || "webp";
    const path = selectedGarden.id + "/" + crypto.randomUUID() + "." + extension;
    const { error: uploadError } = await activeClientRef.current.storage.from("garden-photos").upload(path, file, {
      cacheControl: "3600", contentType: file.type, upsert: false,
    });
    if (uploadError) {
      console.error("Upload writing photo failed:", uploadError);
      setError("Chưa tải được ảnh. Bạn thử lại nhé.");
      setUploading(false);
      return;
    }
    if (asCover) {
      const { error: coverError } = await activeClientRef.current.from("gardens").update({ cover_path: path }).eq("id", selectedGarden.id);
      if (coverError) {
        console.error("Set book cover failed:", coverError);
        setError("Ảnh đã tải lên nhưng chưa đặt được làm ảnh bìa.");
        setUploading(false);
        return;
      }
      setCoverPath(path);
      const { data } = await activeClientRef.current.storage.from("garden-photos").createSignedUrl(path, 60 * 60);
      setCoverUrl(data?.signedUrl ?? "");
    }
    const { data: albumFiles, error: albumError } = await activeClientRef.current.storage.from("garden-photos").list(selectedGarden.id, {
      limit: 40, sortBy: { column: "created_at", order: "desc" },
    });
    if (albumError) {
      console.warn("Refresh uploaded images failed:", albumError);
    } else {
      const imageFiles = (albumFiles ?? []).filter((item) => item.name && item.id && IMAGE_TYPES.has(item.metadata?.mimetype ?? ""));
      const signed = await Promise.all(imageFiles.map(async (item) => {
        const imagePath = selectedGarden.id + "/" + item.name;
        const { data } = await activeClientRef.current.storage.from("garden-photos").createSignedUrl(imagePath, 60 * 60);
        return data?.signedUrl ? { path: imagePath, url: data.signedUrl, alt: "Ảnh trong tác phẩm" } : null;
      }));
      setPhotos(signed.filter((photo): photo is GardenJournalPhoto => photo !== null));
    }
    setNotice(asCover ? "Đã cập nhật ảnh bìa." : "Đã thêm ảnh vào bộ sưu tập.");
    setUploading(false);
  }

  async function reviewGuestbook(entry: GuestbookRow, status: "approved" | "rejected") {
    if (!isAdmin) return;
    const { error: updateError } = await activeClientRef.current.from("garden_guestbook").update({ status }).eq("id", entry.id);
    if (updateError) {
      setError("Chưa cập nhật được lời nhắn.");
      return;
    }
    if (selectedGarden) {
      const { data, error } = await activeClientRef.current.from("garden_guestbook")
        .select("id,guest_name,message,status,created_at")
        .eq("garden_id", selectedGarden.id)
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) setError("Đã cập nhật trạng thái nhưng chưa tải lại được dbạn sách lời nhắn.");
      else setGuestbook((data ?? []) as GuestbookRow[]);
    }
  }

  async function copyShareLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setNotice("Đã sao chép liên kết.");
    } catch {
      setError("Trình duyệt không cho sao chép tự động. Bạn hãy chọn và sao chép đường link.");
    }
  }

  async function submitForReview() {
    if (isAdmin || !selectedGarden || saving) return;
    if (!contentReady()) {
      setError(format === "message" ? "Hãy viết nội dung thông điệp trước khi gửi duyệt."
        : format === "letter" ? "Hãy viết nội dung bức thư trước khi gửi duyệt."
        : "Hãy thêm ít nhất một chương có nội dung trước khi gửi duyệt.");
      return;
    }
    setSaving(true);
    setError("");
    const { error: submitError } = await activeClientRef.current.from("gardens")
      .update({ ...draftPayload(), approval_status: "pending" })
      .eq("id", selectedGarden.id).eq("owner_id", userId);
    if (submitError) {
      console.error("Submit story for review failed:", submitError);
      setError("Chưa gửi được tác phẩm cho Admin. Nội dung của bạn vẫn được giữ lại.");
      setSaving(false);
      return;
    }
    await loadGardens(userId, false);
    setNotice("Đã gửi tác phẩm cho Admin kiểm duyệt. Nội dung sẽ tạm khóa trong thời gian xem xét.");
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
      setError("Chưa rút được yêu cầu duyệt. Bạn thử lại nhé.");
      setSaving(false);
      return;
    }
    await loadGardens(userId, false);
    setNotice("Đã rút yêu cầu duyệt. Bạn có thể tiếp tục chỉnh sửa bản thảo.");
    setSaving(false);
  }

  async function setApprovalStatus(status: "approved" | "rejected") {
    if (!isAdmin || !selectedGarden || saving) return;
    if (status === "approved" && !contentReady()) {
      setError("Tác phẩm cần có tên và nội dung hoàn chỉnh trước khi duyệt.");
      return;
    }
    setSaving(true);
    setError("");
    const { error: reviewError } = await activeClientRef.current.from("gardens")
      .update({ approval_status: status }).eq("id", selectedGarden.id);
    if (reviewError) {
      console.error("Story moderation failed:", reviewError);
      setError("Chưa cập nhật được trạng thái kiểm duyệt.");
      setSaving(false);
      return;
    }
    await loadGardens(userId, true);
    setNotice(status === "approved" ? "Đã duyệt tác phẩm. Admin có thể xuất bản khi sẵn sàng." : "Đã từ chối tác phẩm này.");
    setSaving(false);
  }

  function markPreviewRead(id: string) {
    setPreviewReadIds((current) => current.includes(id) ? current : [...current, id]);
  }

  if (loading || !authReady) {
    return <main className={styles.loading}><span>✎</span><p>Đang mở không gian sáng tác...</p></main>;
  }
  if (!userId) {
    return <main className={styles.loading}><p>{error || "Bạn cần đăng nhập để bắt đầu sáng tác."}</p><Link href="/login?next=%2Fstudio">Đăng nhập để sáng tác</Link><Link href="/">Về trang chủ</Link></main>;
  }

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <Link href="/" className={styles.brand}><span>✎</span><strong>Little Story World <small>WRITING STUDIO · KHÔNG GIAN SÁNG TÁC</small></strong></Link>
        <nav aria-label="Điều hướng không gian sáng tác">
          {isAdmin && <Link href="/admin">Trung tâm Admin</Link>}
          {selectedGarden?.is_published && shareUrl && <a href={shareUrl} target="_blank" rel="noreferrer">Mở bản người đọc ↗</a>}
          <Link href="/">Trang chủ</Link>
          <button type="button" onClick={() => void handleLogout()}>{isAdmin ? "Thoát Admin" : "Đăng xuất"}</button>
        </nav>
      </header>

      <section className={styles.welcome}>
        <div className={styles.welcomeCopy}>
          <p className={styles.eyebrow}>WRITE SOMETHING MEANINGFUL</p>
          <h1>{isAdmin ? "Không gian sáng tác và kiểm duyệt." : "Câu chuyện của bạn bắt đầu từ đây."}</h1>
          <p>{isAdmin ? "Quản lý bản thảo của mọi tài khoản, kiểm duyệt nội dung và quyết định tác phẩm nào được xuất bản." : "Viết một thông điệp, một bức thư hoặc cả cuốn sách. Lưu bản nháp riêng tư rồi gửi Admin kiểm duyệt trước khi chia sẻ."}</p>
        </div>
        <div className={styles.welcomePhoto} role="img" aria-label="Cuốn sách mở dưới ánh sáng tự nhiên">
          <span>YOUR WORDS, YOUR PAGES</span>
        </div>
      </section>

      {error && <p className={styles.error} role="alert">{error}</p>}
      {notice && <p className={styles.notice} role="status">{notice}</p>}

      <div className={styles.workspace}>
        <aside className={styles.sidebar}>
          <div className={styles.sideHeader}>
            <div><span className={styles.eyebrow}>MY WRITING DESK</span><h2>Bản thảo của bạn</h2></div>
            <button type="button" onClick={createWork} disabled={saving}>＋ Tạo mới</button>
          </div>
          {gardens.length === 0 ? <p className={styles.empty}>Chưa có bản thảo nào. Bắt đầu bằng một tác phẩm mới nhé.</p> : gardens.map((garden) => (
            <button key={garden.id} type="button" className={garden.id === selectedId ? styles.workActive : styles.workButton} onClick={() => setSelectedId(garden.id)}>
              <span className={styles.workMark}>{garden.experience_settings?.storyFormat === "message" ? "✎" : garden.experience_settings?.storyFormat === "letter" ? "✉" : "▤"}</span>
              <span><strong>{garden.name}</strong><small>{garden.is_published ? "Đã xuất bản" : garden.approval_status === "pending" ? "Chờ Admin duyệt" : garden.approval_status === "approved" ? "Đã duyệt · Chưa xuất bản" : garden.approval_status === "rejected" ? "Cần chỉnh sửa" : "Bản nháp riêng tư"}</small></span>
            </button>
          ))}
          <div className={styles.sidebarNote}><strong>Gợi ý nhỏ</strong><p>Một câu thật lòng luôn đáng nhớ hơn rất nhiều dòng chữ viết cho đủ.</p></div>
        </aside>

        {selectedGarden ? (
          <section className={styles.editor}>
            <div className={styles.editorHeading}>
              <div><p className={styles.eyebrow}>YOUR WRITING DESK</p><h2>{name || selectedGarden.name}</h2></div>
              <span className={selectedGarden.is_published ? styles.published : styles.draft}>{selectedGarden.is_published ? "Đang chia sẻ" : selectedGarden.approval_status === "pending" ? "Đang chờ Admin duyệt" : selectedGarden.approval_status === "approved" ? "Đã duyệt · Chưa xuất bản" : selectedGarden.approval_status === "rejected" ? "Cần chỉnh sửa và gửi lại" : "Bản nháp riêng tư"}</span>
            </div>
            <nav className={styles.stepNav} aria-label="Các bước sáng tác">
              <a href="#write-01">01 <span>Chọn dạng</span></a>
              <a href="#write-02">02 <span>Viết nội dung</span></a>
              <a href="#write-03">03 <span>Hình ảnh</span></a>
              {isAdmin && <a href="#write-04">04 <span>Lưu bút</span></a>}
              <a href="#write-05">{isAdmin ? "05" : "04"} <span>{isAdmin ? "Xem & gửi" : "Xem & gửi duyệt"}</span></a>
            </nav>

            {!isAdmin && selectedGarden.approval_status === "pending" && <p className={styles.notice} role="status">Bản thảo đã được gửi Admin kiểm duyệt. Nội dung tạm khóa trong thời gian xem xét.</p>}
            {!isAdmin && selectedGarden.approval_status === "approved" && <p className={styles.notice} role="status">Tác phẩm đã được Admin duyệt. Bạn có thể chờ xuất bản hoặc liên hệ Admin nếu cần chỉnh sửa.</p>}
            <fieldset className={styles.creatorFieldset} disabled={isCreatorReviewLocked}>
            <section className={styles.section} id="write-01">
              <div className={styles.sectionTitle}><span>01</span><div><h3>Bạn muốn tạo điều gì?</h3><p>Chọn một kiểu phù hợp với điều bạn muốn gửi gắm. Nội dung cũ vẫn được giữ khi bạn đổi kiểu.</p></div></div>
              <div className={styles.formatGrid}>
                {FORMATS.map((item) => (
                  <button key={item.value} type="button" className={format === item.value ? styles.formatActive : styles.formatCard}
                    aria-pressed={format === item.value} onClick={() => setFormat(item.value)}>
                    <span className={styles.formatMark}>{item.symbol}</span><strong>{item.title}</strong><small>{item.description}</small>
                    <span className={styles.formatCheck}>{format === item.value ? "✓ Đang chọn" : "Chọn kiểu này"}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className={styles.section} id="write-02">
              <div className={styles.sectionTitle}><span>02</span><div><h3>Viết nội dung của bạn</h3><p>Không cần căn chỉnh trang. Hệ thống tự trình bày thành trải nghiệm đọc sách.</p></div></div>
              <label className={styles.field}>Tên tác phẩm<input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} placeholder="Ví dụ: Gửi người mình thương..."/></label>

              {format === "message" && (
                <div className={styles.writerPanel}>
                  <div className={styles.writerHeading}><span>✎</span><div><strong>Thông điệp của bạn</strong><small>Một trang ngắn gọn và chân thành.</small></div></div>
                  <label className={styles.field}>Nội dung thông điệp<textarea value={introduction} onChange={(event) => setIntroduction(event.target.value)} rows={10} maxLength={7000} placeholder="Bạn muốn nói điều gì với người nhận? Cứ viết tự nhiên như đang trò chuyện..."/></label>
                  <p className={styles.helper}>Mỗi dòng trống sẽ tách thành một đoạn văn riêng.</p>
                </div>
              )}

              {format === "letter" && (
                <div className={styles.writerPanel}>
                  <div className={styles.writerHeading}><span>✉</span><div><strong>Bức thư của bạn</strong><small>Một lá thư với lời mở đầu và chữ ký.</small></div></div>
                  <label className={styles.field}>Lời dẫn ngắn<input value={introduction} onChange={(event) => setIntroduction(event.target.value)} maxLength={300} placeholder="Một câu giới thiệu để người nhận mở thư..."/></label>
                  <label className={styles.field}>Tiêu đề thư<input value={letterTitle} maxLength={100} onChange={(event) => setLetterTitle(event.target.value)} placeholder="Gửi em, vào một ngày thật đẹp..."/></label>
                  <label className={styles.field}>Nội dung thư<textarea value={letterText} onChange={(event) => setLetterText(event.target.value)} rows={12} maxLength={12000} placeholder="Bắt đầu viết bức thư của bạn tại đây..."/></label>
                  <label className={styles.field}>Chữ ký<input value={signature} maxLength={80} onChange={(event) => setSignature(event.target.value)} placeholder="Thân thương, ..."/></label>
                </div>
              )}

              {format === "book" && (
                <div className={styles.writerPanel}>
                  <div className={styles.writerHeading}><span>▤</span><div><strong>Cuốn sách của bạn</strong><small>Viết lời giới thiệu và thêm từng chương theo mạch truyện.</small></div></div>
                  <label className={styles.field}>Lời giới thiệu<textarea value={introduction} onChange={(event) => setIntroduction(event.target.value)} rows={3} maxLength={700} placeholder="Một vài dòng dẫn người đọc bước vào câu chuyện..."/></label>
                  <div className={styles.chapterWorkspace}>
                    <div className={styles.chapterPanel}>
                      <div className={styles.chapterPanelHeading}><strong>Mục lục bản thảo</strong><span>{chapters.length} chương</span></div>
                      {chapters.length === 0 ? <p className={styles.chapterEmpty}>Chưa có chương. Bạn có thể viết chương đầu tiên ở bên cạnh.</p> : chapters.map((chapter, index) => (
                        <div className={styles.chapterItem} key={chapter.chapter_id}>
                          <button type="button" className={chapter.chapter_id === selectedChapterId ? styles.chapterActive : styles.chapterSelect} onClick={() => chooseChapter(chapter)}>
                            <span>{String(index + 1).padStart(2, "0")}</span><strong>{chapter.title}</strong>
                          </button>
                          <button type="button" className={styles.deleteChapter} onClick={() => void deleteChapter(chapter.chapter_id)} aria-label={"Xóa " + chapter.title}>×</button>
                        </div>
                      ))}
                    </div>
                    <div className={styles.chapterForm}>
                      {selectedChapter ? (
                        <>
                          <div className={styles.chapterFormHeading}><strong>Chỉnh sửa chương</strong><span>Chương {selectedChapter.sort_order}</span></div>
                          <label className={styles.field}>Tên chương<input value={chapterTitleDraft} onChange={(event) => setChapterTitleDraft(event.target.value)} maxLength={120}/></label>
                          <label className={styles.field}>Nội dung<textarea value={chapterTextDraft} onChange={(event) => setChapterTextDraft(event.target.value)} rows={8} maxLength={16000}/></label>
                          <button type="button" className={styles.secondaryButton} onClick={() => void saveChapter()} disabled={saving}>{saving ? "Đang lưu..." : "Lưu chương này"}</button>
                        </>
                      ) : (
                        <>
                          <div className={styles.chapterFormHeading}><strong>Viết chương đầu tiên</strong><span>01</span></div>
                          <p className={styles.chapterEmpty}>Mỗi chương trở thành một lượt lật trang trong cuốn sách.</p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className={styles.addChapterPanel}>
                    <div className={styles.chapterFormHeading}><strong>＋ Thêm chương mới</strong><span>Chương {Math.max(0, ...chapters.map((chapter) => chapter.sort_order)) + 1}{!isAdmin ? " / 8" : ""}</span></div>
                    {!isAdmin && <p className={styles.helper}>Tài khoản sáng tác có thể viết tối đa 8 chương cho mỗi cuốn sách.</p>}
                    <label className={styles.field}>Tên chương<input value={newChapterTitle} onChange={(event) => setNewChapterTitle(event.target.value)} maxLength={120} placeholder="Ví dụ: Ngày mình gặp nhau..."/></label>
                    <label className={styles.field}>Nội dung chương<textarea value={newChapterText} onChange={(event) => setNewChapterText(event.target.value)} rows={6} maxLength={16000} placeholder="Viết nội dung chương tiếp theo..."/></label>
                    <button type="button" className={styles.primaryButton} onClick={() => void addChapter()} disabled={saving || !newChapterTitle.trim() || (!isAdmin && chapters.length >= CREATOR_MAX_CHAPTERS)}>{saving ? "Đang thêm..." : !isAdmin && chapters.length >= CREATOR_MAX_CHAPTERS ? "Đã đạt giới hạn 8 chương" : "Thêm chương vào sách"}</button>
                  </div>
                  <div className={styles.writerInset}>
                    <label className={styles.field}>Tiêu đề lá thư cuối (không bắt buộc)<input value={letterTitle} maxLength={100} onChange={(event) => setLetterTitle(event.target.value)}/></label>
                    <label className={styles.field}>Nội dung lá thư cuối<textarea value={letterText} onChange={(event) => setLetterText(event.target.value)} rows={4} maxLength={5000} placeholder="Có thể để dành một lời nhắn đặc biệt cho trang cuối..."/></label>
                    <label className={styles.field}>Chữ ký<input value={signature} maxLength={80} onChange={(event) => setSignature(event.target.value)} placeholder="Người viết"/></label>
                    <p className={styles.helper}>Lá thư cuối sẽ xuất hiện sau khi người đọc hoàn thành các chương.</p>
                  </div>
                </div>
              )}
            </section>

            <section className={styles.section} id="write-03">
              <div className={styles.sectionTitle}><span>03</span><div><h3>Hình ảnh do bạn chọn</h3><p>Ảnh bìa và ảnh kỷ niệm do bạn tải lên. Ảnh minh họa sách chỉ dùng làm nền giao diện khi chưa có ảnh bìa.</p></div></div>
              {coverUrl && <div className={styles.coverPreview}><Image src={coverUrl} alt="Ảnh bìa tác phẩm" width={1200} height={720} unoptimized/><span>Ảnh bìa của tác phẩm</span></div>}
              <div className={styles.uploadGrid}>
                <label className={styles.uploadCard}>＋ Tải ảnh bìa lên<input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" onChange={(event) => void uploadPhoto(event, true)} disabled={uploading || (!isAdmin && photos.length >= CREATOR_MAX_PHOTOS)}/><small>JPG, PNG, WEBP, AVIF hoặc GIF · tối đa {isAdmin ? "10 MB" : "5 MB"}</small></label>
                <label className={styles.uploadCard}>＋ Thêm ảnh kỷ niệm<input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" onChange={(event) => void uploadPhoto(event, false)} disabled={uploading || (!isAdmin && photos.length >= CREATOR_MAX_PHOTOS)}/><small>{isAdmin ? "Tối đa 40 ảnh trong album" : "Tối đa 5 ảnh trong mỗi tác phẩm"}</small></label>
              </div>
              {uploading && <p className={styles.helper}>Đang tải ảnh lên...</p>}
              {photos.length > 0 && <div className={styles.albumPreview}><strong>{photos.length} ảnh trong album</strong><div>{photos.slice(0, 6).map((photo) => <Image key={photo.path} src={photo.url} alt={photo.alt} width={100} height={78} unoptimized/>)}</div></div>}
            </section>

            </fieldset>
            {isAdmin && <section className={styles.section} id="write-04">
              <div className={styles.sectionTitle}><span>04</span><div><h3>Lời nhắn từ người đọc</h3><p>Người nhận có thể để lại vài dòng sau khi đọc xong. Bạn duyệt trước khi hiển thị.</p></div></div>
              <label className={styles.toggle}><input type="checkbox" checked={guestbookEnabled} onChange={(event) => setGuestbookEnabled(event.target.checked)}/> Cho phép người đọc để lại lời nhắn</label>
              <div className={styles.guestStats}><span>{pendingCount} chờ duyệt</span><span>{approvedCount} đã duyệt</span></div>
              {guestbook.map((entry) => <div className={styles.guestEntry} key={entry.id}>
                <div><strong>{entry.guest_name}</strong><small>{new Date(entry.created_at).toLocaleString("vi-VN")}</small><p>{entry.message}</p></div>
                <span className={styles.guestStatus}>{entry.status === "pending" ? "Chờ duyệt" : entry.status === "approved" ? "Đã duyệt" : "Đã ẩn"}</span>
                {entry.status !== "approved" && <button type="button" onClick={() => void reviewGuestbook(entry, "approved")}>Duyệt</button>}
                {entry.status !== "rejected" && <button type="button" className={styles.textDanger} onClick={() => void reviewGuestbook(entry, "rejected")}>Ẩn</button>}
              </div>)}
              {guestbook.length === 0 && <p className={styles.chapterEmpty}>Chưa có lời nhắn nào.</p>}
            </section>}

            <section className={styles.section} id="write-05">
              <div className={styles.sectionTitle}><span>{isAdmin ? "05" : "04"}</span><div><h3>Xem trước và gửi tác phẩm</h3><p>Kiểm tra trải nghiệm lật trang, mục lục và hình ảnh trước khi gửi.</p></div></div>
              <div className={styles.actionCard}><div><strong>Bản xem trước</strong><p>Mở thử tác phẩm như người nhận sẽ thấy.</p></div><button type="button" className={styles.secondaryButton} onClick={() => { setPreviewReadIds([]); setPreviewOpen(true); }}>◉ Xem trước</button></div>
              <div className={styles.actionCard}><div><strong>Lưu riêng tư</strong><p>Lưu nội dung hiện tại mà không tạo link công khai.</p></div><button type="button" className={styles.primaryButton} onClick={() => void saveDraft()} disabled={saving || isCreatorReviewLocked}>{saving ? "Đang lưu..." : "Lưu bản nháp"}</button></div>
              {isAdmin ? (
                <div className={styles.publishPanel}>
                  <div className={styles.publishHeading}><span>✉</span><div><strong>Kiểm duyệt và xuất bản</strong><p>Admin xem xét nội dung trước khi tạo link và chia sẻ.</p></div></div>
                  <div className={styles.actionCard}><div><strong>Trạng thái kiểm duyệt</strong><p>{selectedGarden.approval_status === "pending" ? "Tác phẩm đang chờ Admin xem xét." : selectedGarden.approval_status === "approved" ? "Tác phẩm đã được duyệt." : selectedGarden.approval_status === "rejected" ? "Tác phẩm đã bị từ chối." : "Bản thảo chưa được gửi duyệt."}</p></div>
                    {selectedGarden.approval_status !== "approved" && <button type="button" className={styles.primaryButton} onClick={() => void setApprovalStatus("approved")} disabled={saving}>Duyệt tác phẩm</button>}
                    {selectedGarden.approval_status !== "rejected" && <button type="button" className={styles.secondaryButton} onClick={() => void setApprovalStatus("rejected")} disabled={saving}>Từ chối</button>}
                  </div>
                  <label className={styles.toggle}><input type="checkbox" checked={pinEnabled} onChange={(event) => setPinEnabled(event.target.checked)}/> Yêu cầu mã PIN khi mở tác phẩm</label>
                  {pinEnabled && <label className={styles.field}>Mã PIN · tối thiểu 6 ký tự<input type="password" value={pinDraft} onChange={(event) => setPinDraft(event.target.value)} placeholder={pinExists ? "Để trống để giữ mã PIN hiện tại" : "Nhập mã PIN cho người nhận"}/></label>}
                  <button type="button" className={selectedGarden.is_published ? styles.unpublishButton : styles.publishButton} onClick={() => void publishWork(!selectedGarden.is_published)} disabled={saving || (!selectedGarden.is_published && selectedGarden.approval_status !== "approved")}>
                    {saving ? "Đang cập nhật..." : selectedGarden.is_published ? "Chuyển về bản nháp" : selectedGarden.approval_status !== "approved" ? "Duyệt trước khi xuất bản" : "Xuất bản và tạo link"}
                  </button>
                  {selectedGarden.is_published && shareUrl && <div className={styles.shareResult}>
                    <div className={styles.shareLinkBlock}><strong>Liên kết tác phẩm</strong><code>{shareUrl}</code><div><button type="button" onClick={() => void copyShareLink()}>Sao chép link</button><a href={shareUrl} target="_blank" rel="noreferrer">Mở trang người đọc ↗</a></div><small>{pinExists ? "Người nhận cần nhập mã PIN." : "Người nhận có thể mở trực tiếp."}</small></div>
                    <div className={styles.qrCode} role="img" aria-label="Mã QR để mở tác phẩm" style={{ backgroundImage: "url(" + qrUrl + ")" }}/>
                  </div>}
                </div>
              ) : (
                <div className={styles.publishPanel}>
                  <div className={styles.publishHeading}><span>✉</span><div><strong>Gửi bản thảo cho Admin kiểm duyệt</strong><p>Tác phẩm sẽ được giữ riêng tư cho đến khi Admin xem xét và duyệt. Bạn không cần tự tạo link công khai.</p></div></div>
                  <div className={styles.actionCard}><div><strong>Trạng thái hiện tại</strong><p>{selectedGarden.approval_status === "pending" ? "Đã gửi duyệt. Admin sẽ xem nội dung trước khi xuất bản." : selectedGarden.approval_status === "approved" ? "Tác phẩm đã được duyệt. Admin sẽ quyết định thời điểm chia sẻ." : selectedGarden.approval_status === "rejected" ? "Admin đề nghị bạn chỉnh sửa rồi gửi lại." : "Bản thảo chỉ bạn nhìn thấy. Có thể lưu riêng tư hoặc gửi duyệt khi đã hoàn tất."}</p></div></div>
                  <button type="button" className={styles.primaryButton} onClick={() => void submitForReview()} disabled={saving || !contentReady() || selectedGarden.approval_status === "pending" || selectedGarden.approval_status === "approved"}>
                    {saving ? "Đang gửi..." : selectedGarden.approval_status === "pending" ? "Đang chờ Admin duyệt" : selectedGarden.approval_status === "approved" ? "Đã được Admin duyệt" : "Gửi Admin kiểm duyệt"}
                  </button>
                  {selectedGarden.approval_status === "pending" && <button type="button" className={styles.secondaryButton} onClick={() => void withdrawReview()} disabled={saving}>Rút yêu cầu duyệt</button>}
                </div>
              )}
              </section>
            </section>
        ) : (
          <section className={styles.emptyEditor}><span>✎</span><h2>Một trang giấy đang chờ bạn.</h2><p>Tạo bản thảo đầu tiên và chọn cách kể chuyện mình thích.</p><button type="button" onClick={createWork} disabled={saving}>＋ Bắt đầu viết</button></section>
        )}
      </div>

      <dialog ref={previewRef} className={styles.previewDialog} onClose={() => setPreviewOpen(false)}
        onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }} aria-label="Bản xem trước tác phẩm">
        {selectedGarden && <>
          <header className={styles.previewHeader}><div><p className={styles.eyebrow}>BẢN XEM TRƯỚC · CHỈ ANH NHÌN THẤY</p><h2>{name || selectedGarden.name}</h2></div><button type="button" onClick={() => setPreviewOpen(false)}>Đóng ✕</button></header>
          <div className={styles.previewBody}>
            <GardenJournal key={selectedGarden.id + "-" + format} name={name || selectedGarden.name} introduction={introduction} format={format}
              coverUrl={coverUrl} coverPath={coverPath} photos={photos} chapters={journalChapters} readIds={previewReadIds}
              onOpenChapter={markPreviewRead} letterTitle={letterTitle} letterParagraphs={splitText(letterText)}
              letterSignature={signature} letterReady={chapters.length > 0 && chapters.every((chapter) => previewReadIds.includes(chapter.chapter_id))}
              returnHref="/" returnLabel="Little Story World" actionHref="#the-book" actionLabel="MỞ TÁC PHẨM">
              {guestbookEnabled && <section className={styles.previewGuestbook}><h3>Lời nhắn từ người đọc</h3><p>Biểu mẫu gửi lời nhắn sẽ xuất hiện sau khi tác phẩm được xuất bản.</p></section>}
            </GardenJournal>
          </div>
        </>}
      </dialog>
    </main>
  );
}
