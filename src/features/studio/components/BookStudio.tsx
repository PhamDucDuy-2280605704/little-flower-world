"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import GardenJournal, { type GardenJournalPhoto, type JournalChapter, type StoryFormat } from "@/features/garden/components/GardenJournal";
import { adminSupabase } from "@/lib/adminSupabase";
import { FAIRYTALE_TEST_GARDEN_ID } from "@/features/garden/data/gardenThemes";
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
  created_at: string;
};
type ChapterRow = { chapter_id: string; sort_order: number; title: string; paragraphs: string[] };
type GuestbookRow = { id: string; guest_name: string; message: string; status: "pending" | "approved" | "rejected"; created_at: string };
const FORMATS: Array<{ value: StoryFormat; title: string; description: string; symbol: string }> = [
  { value: "message", title: "Thông điệp", description: "Một trang ngắn để gửi điều anh đang nghĩ.", symbol: "✎" },
  { value: "letter", title: "Bức thư", description: "Một lá thư riêng với lời mở đầu và chữ ký.", symbol: "✉" },
  { value: "book", title: "Cuốn sách", description: "Nhiều chương, mục lục và trải nghiệm lật trang.", symbol: "▤" },
];
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);

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
  const selectedChapter = chapters.find((chapter) => chapter.chapter_id === selectedChapterId) ?? null;
  const journalChapters = useMemo<JournalChapter[]>(() => chapters.map((chapter) => ({
    id: chapter.chapter_id, title: chapter.title, paragraphs: chapter.paragraphs,
  })), [chapters]);
  const shareUrl = selectedGarden?.is_published && selectedGarden.share_slug
    ? (typeof window === "undefined" ? "https://little-flower-world.vercel.app" : window.location.origin) + "/g/" + selectedGarden.share_slug
    : "";
  const qrUrl = shareUrl ? "https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=" + encodeURIComponent(shareUrl) : "";
  const pendingCount = guestbook.filter((entry) => entry.status === "pending").length;
  const approvedCount = guestbook.filter((entry) => entry.status === "approved").length;

  const loadGardens = useCallback(async (ownerId: string) => {
    const { data, error: queryError } = await adminSupabase.from("gardens")
      .select("id,owner_id,name,introduction,letter_title,letter_paragraphs,letter_signature,share_slug,is_published,published_at,cover_path,experience_settings,guestbook_enabled,created_at")
      .or("owner_id.eq." + ownerId + ",id.eq." + FAIRYTALE_TEST_GARDEN_ID)
      .order("created_at", { ascending: false });
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
    const [chapterResult, secretResult, guestbookResult] = await Promise.all([
      adminSupabase.from("garden_chapters").select("chapter_id,sort_order,title,paragraphs")
        .eq("garden_id", garden.id).order("sort_order", { ascending: true }),
      adminSupabase.from("garden_share_secrets").select("garden_id").eq("garden_id", garden.id).maybeSingle(),
      adminSupabase.from("garden_guestbook").select("id,guest_name,message,status,created_at")
        .eq("garden_id", garden.id).order("created_at", { ascending: false }).limit(60),
    ]);
    if (chapterResult.error) throw chapterResult.error;
    if (secretResult.error) throw secretResult.error;
    if (guestbookResult.error) throw guestbookResult.error;

    const loadedChapters = (chapterResult.data ?? []).map((chapter) => ({
      ...chapter, paragraphs: paragraphs(chapter.paragraphs),
    })) as ChapterRow[];
    setChapters(loadedChapters);
    setSelectedChapterId((current) => loadedChapters.some((chapter) => chapter.chapter_id === current) ? current : loadedChapters[0]?.chapter_id ?? "");
    setGuestbook((guestbookResult.data ?? []) as GuestbookRow[]);

    const settings = garden.experience_settings ?? {};
    const savedFormat = settings.storyFormat;
    setFormat(savedFormat === "message" || savedFormat === "letter" ? savedFormat : "book");
    setName(garden.name);
    setIntroduction(garden.introduction ?? "");
    setLetterTitle(garden.letter_title || "Một lá thư dành riêng cho bạn");
    setLetterText(paragraphs(garden.letter_paragraphs).join("\n\n"));
    setSignature(garden.letter_signature ?? "");
    setGuestbookEnabled(garden.guestbook_enabled === true);
    setPinExists(Boolean(secretResult.data));
    setPinEnabled(Boolean(secretResult.data));
    setPinDraft("");
    setCoverPath(garden.cover_path ?? "");

    if (garden.cover_path) {
      const { data } = await adminSupabase.storage.from("garden-photos").createSignedUrl(garden.cover_path, 60 * 60);
      setCoverUrl(data?.signedUrl ?? "");
    } else {
      setCoverUrl("");
    }

    const { data: files, error: albumError } = await adminSupabase.storage.from("garden-photos").list(garden.id, {
      limit: 40, sortBy: { column: "created_at", order: "desc" },
    });
    if (albumError) {
      console.warn("Load story album failed:", albumError);
      setPhotos([]);
      return;
    }
    const imageFiles = (files ?? []).filter((file) => file.name && file.id && IMAGE_TYPES.has(file.metadata?.mimetype ?? ""));
    const signed = await Promise.all(imageFiles.map(async (file) => {
      const path = garden.id + "/" + file.name;
      const { data } = await adminSupabase.storage.from("garden-photos").createSignedUrl(path, 60 * 60);
      return data?.signedUrl ? { path, url: data.signedUrl, alt: "Ảnh trong tác phẩm" } : null;
    }));
    setPhotos(signed.filter((photo): photo is GardenJournalPhoto => photo !== null));
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
      setUserId(user.id);
      try {
        await loadGardens(user.id);
      } catch (loadError) {
        console.error("Load writing desk failed:", loadError);
        if (active) setError("Chưa tải được danh sách bản thảo. Anh thử tải lại nhé.");
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
    return {
      name: name.trim() || "Tác phẩm chưa đặt tên",
      introduction: introduction.trim(),
      letter_title: letterTitle.trim() || "Một lá thư dành riêng cho bạn",
      letter_paragraphs: splitText(letterText),
      letter_signature: signature.trim(),
      experience_settings: { ...(selectedGarden?.experience_settings ?? {}), storyFormat: format },
      guestbook_enabled: guestbookEnabled,
    };
  }

  function contentReady() {
    if (!name.trim()) return false;
    if (format === "message") return introduction.trim().length > 0;
    if (format === "letter") return letterText.trim().length > 0;
    return chapters.length > 0 && chapters.some((chapter) => chapter.paragraphs.join("\n").trim().length > 0);
  }

  async function syncPin(): Promise<boolean> {
    if (!selectedGarden) return false;
    if (!pinEnabled && pinExists) {
      const { error: deleteError } = await adminSupabase.from("garden_share_secrets").delete().eq("garden_id", selectedGarden.id);
      if (deleteError) {
        setError("Nội dung đã lưu nhưng chưa gỡ được mã PIN cũ.");
        return false;
      }
      setPinExists(false);
      setPinDraft("");
    } else if (pinEnabled && pinDraft.trim()) {
      const { salt, hash } = await makePinHash(pinDraft.trim());
      const { error: pinError } = await adminSupabase.from("garden_share_secrets").upsert({
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
    const { error: saveError } = await adminSupabase.from("gardens").update(draftPayload()).eq("id", selectedGarden.id);
    if (saveError) {
      console.error("Save draft failed:", saveError);
      setError("Chưa lưu được bản thảo.");
      setSaving(false);
      return;
    }
    if (!(await syncPin())) { setSaving(false); return; }
    await loadGardens(userId);
    setNotice("Đã lưu bản thảo.");
    setSaving(false);
  }

  async function publishWork(publish: boolean) {
    if (!selectedGarden || saving) return;
    if (publish && !contentReady()) {
      setError(format === "message" ? "Anh cần viết nội dung thông điệp trước khi xuất bản."
        : format === "letter" ? "Anh cần viết nội dung bức thư trước khi xuất bản."
        : "Anh cần tạo ít nhất một chương có nội dung trước khi xuất bản.");
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
    const { error: saveError } = await adminSupabase.from("gardens").update(draftPayload()).eq("id", selectedGarden.id);
    if (saveError) {
      setError("Chưa lưu được nội dung trước khi xuất bản.");
      setSaving(false);
      return;
    }
    if (!(await syncPin())) { setSaving(false); return; }
    const slug = selectedGarden.share_slug || slugFor(name || selectedGarden.name);
    const { error: publishError } = await adminSupabase.from("gardens").update({
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
    setNotice(publish ? "Tác phẩm đã xuất bản. Anh có thể gửi liên kết cho người nhận." : "Tác phẩm đã chuyển về bản nháp.");
    setSaving(false);
  }

  async function createWork() {
    if (!userId || saving) return;
    setSaving(true);
    setError("");
    const { data, error: createError } = await adminSupabase.from("gardens").insert({
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
    await loadGardens(userId);
    setSelectedId(data.id);
    setNotice("Đã tạo bản thảo mới. Chọn kiểu tác phẩm rồi bắt đầu viết nhé.");
    setSaving(false);
  }

  async function addChapter() {
    if (!selectedGarden || saving || !newChapterTitle.trim()) return;
    const content = splitText(newChapterText);
    if (content.length === 0) {
      setError("Anh viết nội dung chương trước khi thêm nhé.");
      return;
    }
    setSaving(true);
    setError("");
    const id = "story-" + crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    const order = Math.max(0, ...chapters.map((chapter) => chapter.sort_order)) + 1;
    const { error: insertError } = await adminSupabase.from("garden_chapters").insert({
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
    const { error: updateError } = await adminSupabase.from("garden_chapters").update({
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
    const { error: deleteError } = await adminSupabase.from("garden_chapters").delete()
      .eq("garden_id", selectedGarden.id).eq("chapter_id", id);
    if (deleteError) {
      setError("Chưa xóa được chương.");
      return;
    }
    const remaining = chapters.filter((item) => item.chapter_id !== id).map((item, index) => ({ ...item, sort_order: index + 1 }));
    await Promise.all(remaining.map((item) => adminSupabase.from("garden_chapters").update({ sort_order: item.sort_order })
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
    if (!IMAGE_TYPES.has(file.type) || file.size > 10 * 1024 * 1024) {
      setError("Chọn ảnh JPG, PNG, WEBP, AVIF hoặc GIF tối đa 10 MB nhé.");
      return;
    }
    setUploading(true);
    setError("");
    const extension = file.name.split(".").pop()?.toLowerCase() || "webp";
    const path = selectedGarden.id + "/" + crypto.randomUUID() + "." + extension;
    const { error: uploadError } = await adminSupabase.storage.from("garden-photos").upload(path, file, {
      cacheControl: "3600", contentType: file.type, upsert: false,
    });
    if (uploadError) {
      console.error("Upload writing photo failed:", uploadError);
      setError("Chưa tải được ảnh. Anh thử lại nhé.");
      setUploading(false);
      return;
    }
    if (asCover) {
      const { error: coverError } = await adminSupabase.from("gardens").update({ cover_path: path }).eq("id", selectedGarden.id);
      if (coverError) {
        console.error("Set book cover failed:", coverError);
        setError("Ảnh đã tải lên nhưng chưa đặt được làm ảnh bìa.");
        setUploading(false);
        return;
      }
      setCoverPath(path);
      const { data } = await adminSupabase.storage.from("garden-photos").createSignedUrl(path, 60 * 60);
      setCoverUrl(data?.signedUrl ?? "");
    }
    const { data: albumFiles, error: albumError } = await adminSupabase.storage.from("garden-photos").list(selectedGarden.id, {
      limit: 40, sortBy: { column: "created_at", order: "desc" },
    });
    if (albumError) {
      console.warn("Refresh uploaded images failed:", albumError);
    } else {
      const imageFiles = (albumFiles ?? []).filter((item) => item.name && item.id && IMAGE_TYPES.has(item.metadata?.mimetype ?? ""));
      const signed = await Promise.all(imageFiles.map(async (item) => {
        const imagePath = selectedGarden.id + "/" + item.name;
        const { data } = await adminSupabase.storage.from("garden-photos").createSignedUrl(imagePath, 60 * 60);
        return data?.signedUrl ? { path: imagePath, url: data.signedUrl, alt: "Ảnh trong tác phẩm" } : null;
      }));
      setPhotos(signed.filter((photo): photo is GardenJournalPhoto => photo !== null));
    }
    setNotice(asCover ? "Đã cập nhật ảnh bìa." : "Đã thêm ảnh vào bộ sưu tập.");
    setUploading(false);
  }

  async function reviewGuestbook(entry: GuestbookRow, status: "approved" | "rejected") {
    const { error: updateError } = await adminSupabase.from("garden_guestbook").update({ status }).eq("id", entry.id);
    if (updateError) {
      setError("Chưa cập nhật được lời nhắn.");
      return;
    }
    if (selectedGarden) {
      const { data, error } = await adminSupabase.from("garden_guestbook")
        .select("id,guest_name,message,status,created_at")
        .eq("garden_id", selectedGarden.id)
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) setError("Đã cập nhật trạng thái nhưng chưa tải lại được danh sách lời nhắn.");
      else setGuestbook((data ?? []) as GuestbookRow[]);
    }
  }

  async function copyShareLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setNotice("Đã sao chép liên kết.");
    } catch {
      setError("Trình duyệt không cho sao chép tự động. Anh hãy chọn và sao chép đường link.");
    }
  }

  function markPreviewRead(id: string) {
    setPreviewReadIds((current) => current.includes(id) ? current : [...current, id]);
  }

  if (loading || !authReady) {
    return <main className={styles.loading}><span>✎</span><p>Đang mở không gian sáng tác...</p></main>;
  }
  if (!userId) {
    return <main className={styles.loading}><p>{error || "Anh cần đăng nhập để mở Creator Studio."}</p><Link href="/admin/login">Đăng nhập quản trị</Link><Link href="/">Về trang chủ</Link></main>;
  }

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <Link href="/" className={styles.brand}><span>✎</span><strong>Little Flower World <small>CREATOR STUDIO · KHÔNG GIAN SÁNG TÁC</small></strong></Link>
        <nav aria-label="Điều hướng quản trị">
          <Link href="/admin">Trung tâm Admin</Link>
          {selectedGarden?.is_published && shareUrl && <a href={shareUrl} target="_blank" rel="noreferrer">Mở bản khách ↗</a>}
          <Link href="/">Trang chủ</Link>
          <button type="button" onClick={() => void handleLogout()}>Đăng xuất</button>
        </nav>
      </header>

      <section className={styles.welcome}>
        <div className={styles.welcomeCopy}>
          <p className={styles.eyebrow}>WRITE SOMETHING MEANINGFUL</p>
          <h1>Một điều muốn viết, một điều muốn giữ.</h1>
          <p>Chọn một thông điệp, một bức thư hoặc cả cuốn sách. Anh chỉ cần tập trung vào câu chữ; phần trình bày sẽ được sắp đặt thành trải nghiệm đọc sách.</p>
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
            <div><span className={styles.eyebrow}>MY WRITING DESK</span><h2>Bản thảo của anh</h2></div>
            <button type="button" onClick={createWork} disabled={saving}>＋ Tạo mới</button>
          </div>
          {gardens.length === 0 ? <p className={styles.empty}>Chưa có bản thảo nào. Bắt đầu bằng một tác phẩm mới nhé.</p> : gardens.map((garden) => (
            <button key={garden.id} type="button" className={garden.id === selectedId ? styles.workActive : styles.workButton} onClick={() => setSelectedId(garden.id)}>
              <span className={styles.workMark}>{garden.experience_settings?.storyFormat === "message" ? "✎" : garden.experience_settings?.storyFormat === "letter" ? "✉" : "▤"}</span>
              <span><strong>{garden.name}</strong><small>{garden.is_published ? "Đã xuất bản" : "Bản nháp"}</small></span>
            </button>
          ))}
          <div className={styles.sidebarNote}><strong>Gợi ý nhỏ</strong><p>Một câu thật lòng luôn đáng nhớ hơn rất nhiều dòng chữ viết cho đủ.</p></div>
        </aside>

        {selectedGarden ? (
          <section className={styles.editor}>
            <div className={styles.editorHeading}>
              <div><p className={styles.eyebrow}>YOUR WRITING DESK</p><h2>{name || selectedGarden.name}</h2></div>
              <span className={selectedGarden.is_published ? styles.published : styles.draft}>{selectedGarden.is_published ? "Đang chia sẻ" : "Bản nháp riêng tư"}</span>
            </div>
            <nav className={styles.stepNav} aria-label="Các bước sáng tác">
              <a href="#write-01">01 <span>Chọn dạng</span></a>
              <a href="#write-02">02 <span>Viết nội dung</span></a>
              <a href="#write-03">03 <span>Hình ảnh</span></a>
              <a href="#write-04">04 <span>Lưu bút</span></a>
              <a href="#write-05">05 <span>Xem & gửi</span></a>
            </nav>

            <section className={styles.section} id="write-01">
              <div className={styles.sectionTitle}><span>01</span><div><h3>Anh muốn tạo điều gì?</h3><p>Chọn một kiểu phù hợp với điều anh muốn gửi gắm. Nội dung cũ vẫn được giữ khi anh đổi kiểu.</p></div></div>
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
              <div className={styles.sectionTitle}><span>02</span><div><h3>Viết nội dung của anh</h3><p>Không cần căn chỉnh trang. Hệ thống tự trình bày thành trải nghiệm đọc sách.</p></div></div>
              <label className={styles.field}>Tên tác phẩm<input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} placeholder="Ví dụ: Gửi người mình thương..."/></label>

              {format === "message" && (
                <div className={styles.writerPanel}>
                  <div className={styles.writerHeading}><span>✎</span><div><strong>Thông điệp của anh</strong><small>Một trang ngắn gọn và chân thành.</small></div></div>
                  <label className={styles.field}>Nội dung thông điệp<textarea value={introduction} onChange={(event) => setIntroduction(event.target.value)} rows={10} maxLength={7000} placeholder="Anh muốn nói điều gì với người nhận? Cứ viết tự nhiên như đang trò chuyện..."/></label>
                  <p className={styles.helper}>Mỗi dòng trống sẽ tách thành một đoạn văn riêng.</p>
                </div>
              )}

              {format === "letter" && (
                <div className={styles.writerPanel}>
                  <div className={styles.writerHeading}><span>✉</span><div><strong>Bức thư của anh</strong><small>Một lá thư với lời mở đầu và chữ ký.</small></div></div>
                  <label className={styles.field}>Lời dẫn ngắn<input value={introduction} onChange={(event) => setIntroduction(event.target.value)} maxLength={300} placeholder="Một câu giới thiệu để người nhận mở thư..."/></label>
                  <label className={styles.field}>Tiêu đề thư<input value={letterTitle} maxLength={100} onChange={(event) => setLetterTitle(event.target.value)} placeholder="Gửi em, vào một ngày thật đẹp..."/></label>
                  <label className={styles.field}>Nội dung thư<textarea value={letterText} onChange={(event) => setLetterText(event.target.value)} rows={12} maxLength={12000} placeholder="Bắt đầu viết bức thư của anh tại đây..."/></label>
                  <label className={styles.field}>Chữ ký<input value={signature} maxLength={80} onChange={(event) => setSignature(event.target.value)} placeholder="Thân thương, ..."/></label>
                </div>
              )}

              {format === "book" && (
                <div className={styles.writerPanel}>
                  <div className={styles.writerHeading}><span>▤</span><div><strong>Cuốn sách của anh</strong><small>Viết lời giới thiệu và thêm từng chương theo mạch truyện.</small></div></div>
                  <label className={styles.field}>Lời giới thiệu<textarea value={introduction} onChange={(event) => setIntroduction(event.target.value)} rows={3} maxLength={700} placeholder="Một vài dòng dẫn người đọc bước vào câu chuyện..."/></label>
                  <div className={styles.chapterWorkspace}>
                    <div className={styles.chapterPanel}>
                      <div className={styles.chapterPanelHeading}><strong>Mục lục bản thảo</strong><span>{chapters.length} chương</span></div>
                      {chapters.length === 0 ? <p className={styles.chapterEmpty}>Chưa có chương. Anh có thể viết chương đầu tiên ở bên cạnh.</p> : chapters.map((chapter, index) => (
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
                    <div className={styles.chapterFormHeading}><strong>＋ Thêm chương mới</strong><span>Chương {Math.max(0, ...chapters.map((chapter) => chapter.sort_order)) + 1}</span></div>
                    <label className={styles.field}>Tên chương<input value={newChapterTitle} onChange={(event) => setNewChapterTitle(event.target.value)} maxLength={120} placeholder="Ví dụ: Ngày mình gặp nhau..."/></label>
                    <label className={styles.field}>Nội dung chương<textarea value={newChapterText} onChange={(event) => setNewChapterText(event.target.value)} rows={6} maxLength={16000} placeholder="Viết nội dung chương tiếp theo..."/></label>
                    <button type="button" className={styles.primaryButton} onClick={() => void addChapter()} disabled={saving || !newChapterTitle.trim()}>{saving ? "Đang thêm..." : "Thêm chương vào sách"}</button>
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
              <div className={styles.sectionTitle}><span>03</span><div><h3>Hình ảnh do anh chọn</h3><p>Ảnh bìa và ảnh kỷ niệm do anh tải lên. Ảnh minh họa sách chỉ dùng làm nền giao diện khi chưa có ảnh bìa.</p></div></div>
              {coverUrl && <div className={styles.coverPreview}><Image src={coverUrl} alt="Ảnh bìa tác phẩm" width={1200} height={720} unoptimized/><span>Ảnh bìa của tác phẩm</span></div>}
              <div className={styles.uploadGrid}>
                <label className={styles.uploadCard}>＋ Tải ảnh bìa lên<input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" onChange={(event) => void uploadPhoto(event, true)} disabled={uploading}/><small>JPG, PNG, WEBP, AVIF hoặc GIF · tối đa 10 MB</small></label>
                <label className={styles.uploadCard}>＋ Thêm ảnh kỷ niệm<input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" onChange={(event) => void uploadPhoto(event, false)} disabled={uploading}/><small>Ảnh được thêm vào album, không thay ảnh bìa</small></label>
              </div>
              {uploading && <p className={styles.helper}>Đang tải ảnh lên...</p>}
              {photos.length > 0 && <div className={styles.albumPreview}><strong>{photos.length} ảnh trong album</strong><div>{photos.slice(0, 6).map((photo) => <Image key={photo.path} src={photo.url} alt={photo.alt} width={100} height={78} unoptimized/>)}</div></div>}
            </section>

            <section className={styles.section} id="write-04">
              <div className={styles.sectionTitle}><span>04</span><div><h3>Lời nhắn từ người đọc</h3><p>Người nhận có thể để lại vài dòng sau khi đọc xong. Anh duyệt trước khi hiển thị.</p></div></div>
              <label className={styles.toggle}><input type="checkbox" checked={guestbookEnabled} onChange={(event) => setGuestbookEnabled(event.target.checked)}/> Cho phép người đọc để lại lời nhắn</label>
              <div className={styles.guestStats}><span>{pendingCount} chờ duyệt</span><span>{approvedCount} đã duyệt</span></div>
              {guestbook.map((entry) => <div className={styles.guestEntry} key={entry.id}>
                <div><strong>{entry.guest_name}</strong><small>{new Date(entry.created_at).toLocaleString("vi-VN")}</small><p>{entry.message}</p></div>
                <span className={styles.guestStatus}>{entry.status === "pending" ? "Chờ duyệt" : entry.status === "approved" ? "Đã duyệt" : "Đã ẩn"}</span>
                {entry.status !== "approved" && <button type="button" onClick={() => void reviewGuestbook(entry, "approved")}>Duyệt</button>}
                {entry.status !== "rejected" && <button type="button" className={styles.textDanger} onClick={() => void reviewGuestbook(entry, "rejected")}>Ẩn</button>}
              </div>)}
              {guestbook.length === 0 && <p className={styles.chapterEmpty}>Chưa có lời nhắn nào.</p>}
            </section>

            <section className={styles.section} id="write-05">
              <div className={styles.sectionTitle}><span>05</span><div><h3>Xem trước và gửi tác phẩm</h3><p>Kiểm tra trải nghiệm lật trang, mục lục và hình ảnh trước khi gửi.</p></div></div>
              <div className={styles.actionCard}><div><strong>Bản xem trước</strong><p>Mở thử tác phẩm như người nhận sẽ thấy.</p></div><button type="button" className={styles.secondaryButton} onClick={() => { setPreviewReadIds([]); setPreviewOpen(true); }}>◉ Xem trước</button></div>
              <div className={styles.actionCard}><div><strong>Lưu riêng tư</strong><p>Lưu nội dung hiện tại mà không tạo link công khai.</p></div><button type="button" className={styles.primaryButton} onClick={() => void saveDraft()} disabled={saving}>{saving ? "Đang lưu..." : "Lưu bản nháp"}</button></div>
              <div className={styles.publishPanel}>
                <div className={styles.publishHeading}><span>✉</span><div><strong>Gửi tác phẩm cho người nhận</strong><p>Xuất bản để tạo liên kết riêng. Có thể bật mã PIN để bảo vệ.</p></div></div>
                <label className={styles.toggle}><input type="checkbox" checked={pinEnabled} onChange={(event) => setPinEnabled(event.target.checked)}/> Yêu cầu mã PIN khi mở tác phẩm</label>
                {pinEnabled && <label className={styles.field}>Mã PIN · tối thiểu 6 ký tự<input type="password" value={pinDraft} onChange={(event) => setPinDraft(event.target.value)} placeholder={pinExists ? "Để trống để giữ mã PIN hiện tại" : "Nhập mã PIN cho người nhận"}/></label>}
                <button type="button" className={selectedGarden.is_published ? styles.unpublishButton : styles.publishButton} onClick={() => void publishWork(!selectedGarden.is_published)} disabled={saving}>
                  {saving ? "Đang cập nhật..." : selectedGarden.is_published ? "Chuyển về bản nháp" : "Xuất bản và tạo link"}
                </button>
                {selectedGarden.is_published && shareUrl && <div className={styles.shareResult}>
                  <div className={styles.shareLinkBlock}><strong>Liên kết tác phẩm</strong><code>{shareUrl}</code><div><button type="button" onClick={() => void copyShareLink()}>Sao chép link</button><a href={shareUrl} target="_blank" rel="noreferrer">Mở trang người đọc ↗</a></div><small>{pinExists ? "Người nhận cần nhập mã PIN." : "Người nhận có thể mở trực tiếp."}</small></div>
                  <div className={styles.qrCode} role="img" aria-label="Mã QR để mở tác phẩm" style={{ backgroundImage: "url(" + qrUrl + ")" }}/>
                </div>}
              </div>
            </section>
          </section>
        ) : (
          <section className={styles.emptyEditor}><span>✎</span><h2>Một trang giấy đang chờ anh.</h2><p>Tạo bản thảo đầu tiên và chọn cách kể chuyện mình thích.</p><button type="button" onClick={createWork} disabled={saving}>＋ Bắt đầu viết</button></section>
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
              returnHref="/" returnLabel="Little Flower World" actionHref="#the-book" actionLabel="MỞ TÁC PHẨM">
              {guestbookEnabled && <section className={styles.previewGuestbook}><h3>Lời nhắn từ người đọc</h3><p>Biểu mẫu gửi lời nhắn sẽ xuất hiện sau khi tác phẩm được xuất bản.</p></section>}
            </GardenJournal>
          </div>
        </>}
      </dialog>
    </main>
  );
}
