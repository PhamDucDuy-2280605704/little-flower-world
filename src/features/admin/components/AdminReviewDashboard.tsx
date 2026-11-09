"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { adminSupabase } from "@/lib/adminSupabase";
import { FAIRYTALE_GARDEN_ADMIN_USER_ID } from "@/features/garden/data/gardenThemes";
import GardenJournal, {
  normalizeStoryDecorations,
  type GardenJournalPhoto,
  type JournalChapter,
  type StoryFormat,
} from "@/features/garden/components/GardenJournal";
import FamilyLetterReader from "@/features/garden/components/FamilyLetterReader";
import { useLanguage } from "@/features/i18n/LanguageProvider";
import styles from "../styles/AdminReviewDashboard.module.css";

type ApprovalStatus = "draft" | "pending" | "approved" | "rejected";
type ReviewRow = {
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
  approval_status: ApprovalStatus;
  review_comment: string | null;
  reviewed_at: string | null;
  created_at: string;
};
type FilterKey = "pending" | "all" | "rejected" | "approved";
type StoryEditDraft = {
  name: string;
  introduction: string;
  letterTitle: string;
  letterText: string;
  letterSignature: string;
  guestbookEnabled: boolean;
};
type PreviewStory = {
  id: string;
  name: string;
  introduction: string;
  format: StoryFormat;
  decorations: ReturnType<typeof normalizeStoryDecorations>;
  coverUrl: string | null;
  coverPath: string | null;
  photos: GardenJournalPhoto[];
  chapters: JournalChapter[];
  letterTitle: string;
  letterParagraphs: string[];
  letterSignature: string;
  readOnlyStandalone: boolean;
};

const BUCKET = "garden-photos";

function statusLabel(status: ApprovalStatus, t: (vi: string, en: string) => string) {
  if (status === "pending") return t("Chờ duyệt", "Pending review");
  if (status === "approved") return t("Đã duyệt", "Approved");
  if (status === "rejected") return t("Cần chỉnh sửa", "Changes requested");
  return t("Bản nháp", "Draft");
}

function formatLabel(settings: Record<string, unknown> | null, t: (vi: string, en: string) => string) {
  const value = settings?.storyFormat;
  if (value === "message") return t("Thông điệp", "Message");
  if (value === "letter") return t("Bức thư", "Letter");
  return t("Cuốn sách", "Book");
}

function asParagraphs(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export default function AdminReviewDashboard() {
  const { t } = useLanguage();
  const previewRef = useRef<HTMLDialogElement>(null);
  const [authState, setAuthState] = useState<"checking" | "admin" | "denied">("checking");
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [filter, setFilter] = useState<FilterKey>("pending");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<PreviewStory | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [storyDraft, setStoryDraft] = useState<StoryEditDraft | null>(null);

  const selected = rows.find((row) => row.id === selectedId) ?? null;
  const comment = selected ? (commentDrafts[selected.id] ?? selected.review_comment ?? "") : "";
  const savedStoryDraft: StoryEditDraft | null = selected ? {
    name: selected.name,
    introduction: selected.introduction ?? "",
    letterTitle: selected.letter_title ?? "",
    letterText: asParagraphs(selected.letter_paragraphs).join("\n\n"),
    letterSignature: selected.letter_signature ?? "",
    guestbookEnabled: selected.guestbook_enabled,
  } : null;
  const storyDirty = Boolean(selected && storyDraft && savedStoryDraft && (
    storyDraft.name !== savedStoryDraft.name ||
    storyDraft.introduction !== savedStoryDraft.introduction ||
    storyDraft.letterTitle !== savedStoryDraft.letterTitle ||
    storyDraft.letterText !== savedStoryDraft.letterText ||
    storyDraft.letterSignature !== savedStoryDraft.letterSignature ||
    storyDraft.guestbookEnabled !== savedStoryDraft.guestbookEnabled
  ));
  const pendingCount = rows.filter((row) => row.approval_status === "pending").length;
  const draftCount = rows.filter((row) => row.approval_status === "draft").length;
  const approvedCount = rows.filter((row) => row.approval_status === "approved").length;
  const rejectedCount = rows.filter((row) => row.approval_status === "rejected").length;

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: queryError } = await adminSupabase
      .from("gardens")
      .select("id,owner_id,name,introduction,letter_title,letter_paragraphs,letter_signature,share_slug,is_published,published_at,cover_path,experience_settings,guestbook_enabled,approval_status,review_comment,reviewed_at,created_at")
      .order("created_at", { ascending: false });

    if (queryError) {
      console.error("Load Admin review queue failed:", queryError);
      setError(t("Chưa tải được danh sách tác phẩm. Anh thử tải lại nhé.", "Could not load the story queue. Please reload."));
      setRows([]);
    } else {
      const normalized = (data ?? []).map((row) => ({
        ...row,
        introduction: row.introduction ?? "",
        letter_paragraphs: asParagraphs(row.letter_paragraphs),
        experience_settings: (row.experience_settings ?? {}) as Record<string, unknown>,
      })) as ReviewRow[];
      setRows(normalized);
      setSelectedId((current) => normalized.some((row) => row.id === current)
        ? current
        : normalized.find((row) => row.approval_status === "pending")?.id ?? normalized[0]?.id ?? "");
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    let active = true;
    void adminSupabase.auth.getSession().then(async ({ data, error: sessionError }) => {
      if (!active) return;
      const user = data.session?.user;
      if (sessionError || !user || user.id !== FAIRYTALE_GARDEN_ADMIN_USER_ID) {
        setAuthState("denied");
        return;
      }
      setAuthState("admin");
      await loadRows();
    }).catch((sessionError: unknown) => {
      console.error("Admin review authentication failed:", sessionError);
      if (active) setAuthState("denied");
    });
    return () => { active = false; };
  }, [loadRows]);

  useEffect(() => {
    if (!selected) { setStoryDraft(null); return; }
    setStoryDraft({
      name: selected.name,
      introduction: selected.introduction ?? "",
      letterTitle: selected.letter_title ?? "",
      letterText: asParagraphs(selected.letter_paragraphs).join("\n\n"),
      letterSignature: selected.letter_signature ?? "",
      guestbookEnabled: selected.guestbook_enabled,
    });
  }, [selected, selectedId]); // Refresh the editor only when the selected story changes.

  const filteredRows = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((row) => row.approval_status === filter);
  }, [filter, rows]);

  const openPreview = useCallback(async (row: ReviewRow) => {
    setPreviewLoading(true);
    setError("");
    try {
      const [chapterResult, albumResult] = await Promise.all([
        adminSupabase.from("garden_chapters")
          .select("chapter_id,sort_order,title,paragraphs")
          .eq("garden_id", row.id)
          .order("sort_order", { ascending: true }),
        adminSupabase.storage.from(BUCKET).list(row.id, {
          limit: 40,
          sortBy: { column: "created_at", order: "desc" },
        }),
      ]);
      if (chapterResult.error) throw chapterResult.error;
      if (albumResult.error) throw albumResult.error;

      const files = (albumResult.data ?? []).filter((file) => file.name && file.id);
      const photoRows = files.map((file) => ({ path: row.id + "/" + file.name, name: file.name }));
      const coverRecord = row.cover_path ? photoRows.find((photo) => photo.path === row.cover_path) ?? null : null;
      const ordered = coverRecord
        ? [coverRecord, ...photoRows.filter((photo) => photo.path !== coverRecord.path)]
        : photoRows;
      const [signedPhotos, coverResult] = await Promise.all([
        Promise.all(ordered.map(async (photo) => {
          const { data, error: signedError } = await adminSupabase.storage.from(BUCKET).createSignedUrl(photo.path, 60 * 60);
          if (signedError || !data?.signedUrl) return null;
          return { path: photo.path, url: data.signedUrl, alt: t("Ảnh trong ", "Photo in ") + row.name };
        })),
        row.cover_path
          ? adminSupabase.storage.from(BUCKET).createSignedUrl(row.cover_path, 60 * 60)
          : Promise.resolve({ data: null, error: null }),
      ]);
      const settings = row.experience_settings ?? {};
      const rawFormat = settings.storyFormat;
      const format: StoryFormat = rawFormat === "message" || rawFormat === "letter" ? rawFormat : "book";
      const chapterRows = chapterResult.data ?? [];

      setPreview({
        id: row.id,
        name: row.name,
        introduction: row.introduction ?? "",
        format,
        decorations: normalizeStoryDecorations(settings.storyDecorations),
        coverUrl: coverResult.data?.signedUrl ?? null,
        coverPath: row.cover_path,
        photos: signedPhotos.filter((photo): photo is GardenJournalPhoto => photo !== null),
        chapters: chapterRows.map((chapter) => ({
          id: chapter.chapter_id,
          title: chapter.title,
          paragraphs: asParagraphs(chapter.paragraphs),
        })),
        letterTitle: row.letter_title || t("Một lá thư dành riêng cho bạn", "A letter just for you"),
        letterParagraphs: asParagraphs(row.letter_paragraphs),
        letterSignature: row.letter_signature ?? "",
        readOnlyStandalone: settings.readOnlyStandalone === true,
      });
      setSelectedId(row.id);
    } catch (previewError) {
      console.error("Load Admin review preview failed:", previewError);
      setError(t("Chưa mở được bản xem trước của tác phẩm này.", "Could not open this story preview."));
    } finally {
      setPreviewLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const dialog = previewRef.current;
    if (!dialog) return;
    if (preview && !dialog.open) {
      try { dialog.showModal(); }
      catch (dialogError) { console.error("Open Admin preview dialog failed:", dialogError); }
    } else if (!preview && dialog.open) {
      dialog.close();
    }
  }, [preview]);

  const closePreview = useCallback(() => {
    const dialog = previewRef.current;
    if (dialog?.open) dialog.close();
    setPreview(null);
  }, []);

  async function saveStoryUpdates() {
    if (!selected || !storyDraft || saving || !storyDirty) return;
    const clean = {
      name: storyDraft.name.trim(),
      introduction: storyDraft.introduction.trim(),
      letter_title: storyDraft.letterTitle.trim(),
      letter_paragraphs: storyDraft.letterText.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean),
      letter_signature: storyDraft.letterSignature.trim(),
      guestbook_enabled: storyDraft.guestbookEnabled,
    };
    if (!clean.name || clean.name.length > 120) {
      setError(t("Tên tác phẩm không được để trống và tối đa 120 ký tự.", "Story name is required and must be 120 characters or fewer."));
      return;
    }
    if (clean.introduction.length > 1000 || clean.letter_title.length > 180 || clean.letter_signature.length > 500 || clean.letter_paragraphs.join("\n\n").length > 30000) {
      setError(t("Một hoặc nhiều nội dung vượt quá giới hạn cho phép.", "One or more fields exceed their allowed length."));
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    const { error: updateError } = await adminSupabase.from("gardens").update(clean).eq("id", selected.id);
    if (updateError) {
      console.error("Update Admin story content failed:", updateError);
      setError(t("Chưa cập nhật được nội dung. Trạng thái duyệt và link chia sẻ vẫn được giữ nguyên.", "Could not update the story. Its review status and share link remain unchanged."));
      setSaving(false);
      return;
    }
    await loadRows();
    setStoryDraft({
      name: clean.name,
      introduction: clean.introduction,
      letterTitle: clean.letter_title,
      letterText: clean.letter_paragraphs.join("\n\n"),
      letterSignature: clean.letter_signature,
      guestbookEnabled: clean.guestbook_enabled,
    });
    setNotice(t("Đã cập nhật nội dung tác phẩm. Trạng thái duyệt và liên kết chia sẻ không thay đổi.", "Story content updated. Review status and share link were not changed."));
    setSaving(false);
  }

  async function moderate(status: "approved" | "rejected") {
    if (!selected || saving) return;
    const feedback = comment.trim();
    if (status === "rejected" && !feedback) {
      setError(t("Cần ghi rõ lý do từ chối để người viết biết cách chỉnh sửa.", "A rejection reason is required so the writer knows what to change."));
      return;
    }
    if (feedback.length > 3000) {
      setError(t("Nhận xét tối đa 3.000 ký tự.", "Feedback must be 3,000 characters or fewer."));
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    const { error: updateError } = await adminSupabase
      .from("gardens")
      .update({ approval_status: status, review_comment: feedback || null })
      .eq("id", selected.id);
    if (updateError) {
      console.error("Moderate story failed:", updateError);
      setError(t("Chưa lưu được quyết định kiểm duyệt. Anh thử lại nhé.", "Could not save the moderation decision. Please try again."));
      setSaving(false);
      return;
    }
    await loadRows();
    setNotice(status === "approved"
      ? t("Đã duyệt tác phẩm. Anh có thể mở trình chỉnh sửa Admin để xuất bản sau.", "Story approved. Open the Admin editor when you're ready to publish it.")
      : t("Đã từ chối tác phẩm và lưu lý do để người viết xem lại.", "Story rejected and the reason has been saved for the writer."));
    setSaving(false);
  }

  if (authState === "checking") {
    return <main className={styles.center}><span className={styles.loadingIcon}>✦</span><p>{t("Đang xác minh quyền quản trị...", "Verifying Admin access...")}</p></main>;
  }

  if (authState !== "admin") {
    return (
      <main className={styles.center}>
        <section className={styles.deniedCard}>
          <span className={styles.loadingIcon}>🔒</span>
          <h1>{t("Trang hiện không khả dụng", "Page unavailable")}</h1>
          <p>{t("Không thể mở nội dung tại địa chỉ này.", "This page is not available at this address.")}</p>
          <Link href="/">{t("Về trang chủ", "Back to home")}</Link>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.brandBlock}>
          <Link href="/admin" className={styles.backLink}>← {t("Trung tâm Admin", "Admin center")}</Link>
          <p className={styles.eyebrow}>PRIVATE ADMIN WORKSPACE · REVIEW DESK</p>
          <h1>{t("Bàn kiểm duyệt tác phẩm", "Story review desk")}</h1>
          <p>{t("Xem trọn tác phẩm, đọc nội dung và để lại phản hồi trước khi quyết định.", "Read each story in full and leave feedback before deciding.")}</p>
        </div>
        <div className={styles.topActions}>
          <button type="button" onClick={() => void loadRows()} disabled={loading}>{loading ? t("Đang tải...", "Loading...") : t("Làm mới", "Refresh")} ↻</button>
          <Link href="/admin/studio?mode=admin">{t("Mở Studio Admin", "Open Admin Studio")} ↗</Link>
        </div>
      </header>

      <section className={styles.metrics}>
        <article className={styles.metricPending}><span>◷</span><div><strong>{pendingCount}</strong><small>{t("Đang chờ duyệt", "Awaiting review")}</small></div></article>
        <article><span>▤</span><div><strong>{draftCount}</strong><small>{t("Bản nháp riêng tư", "Private drafts")}</small></div></article>
        <article><span>✓</span><div><strong>{approvedCount}</strong><small>{t("Đã duyệt", "Approved")}</small></div></article>
        <article><span>↺</span><div><strong>{rejectedCount}</strong><small>{t("Cần chỉnh sửa", "Changes requested")}</small></div></article>
      </section>

      {error && <p className={styles.error} role="alert">{error}</p>}
      {notice && <p className={styles.notice} role="status">{notice}</p>}

      <section className={styles.reviewWorkspace}>
        <aside className={styles.queuePanel}>
          <div className={styles.queueHeader}>
            <div><p className={styles.eyebrow}>{t("BỘ SƯU TẬP", "STORY QUEUE")}</p><h2>{t("Danh sách tác phẩm", "Story queue")}</h2></div>
            <span>{rows.length}</span>
          </div>
          <div className={styles.filters} aria-label={t("Lọc tác phẩm", "Filter stories")}>
            {([
              ["pending", t("Chờ duyệt", "Pending")],
              ["all", t("Tất cả", "All")],
              ["rejected", t("Từ chối", "Rejected")],
              ["approved", t("Đã duyệt", "Approved")],
            ] as const).map(([value, label]) => (
              <button key={value} type="button" className={filter === value ? styles.filterActive : styles.filterButton} onClick={() => setFilter(value)}>{label}</button>
            ))}
          </div>
          {loading ? <p className={styles.emptyQueue}>{t("Đang tải tác phẩm...", "Loading stories...")}</p>
            : filteredRows.length === 0 ? <p className={styles.emptyQueue}>{filter === "pending" ? t("Hiện không có tác phẩm chờ duyệt.", "There are no stories waiting for review.") : t("Không có tác phẩm trong mục này.", "No stories in this view.")}</p>
              : <div className={styles.queueList}>
                {filteredRows.map((row) => (
                  <button key={row.id} type="button" className={selectedId === row.id ? styles.queueItemActive : styles.queueItem} onClick={() => setSelectedId(row.id)}>
                    <span className={styles.queueIcon}>{row.approval_status === "pending" ? "◷" : row.approval_status === "approved" ? "✓" : row.approval_status === "rejected" ? "↺" : "▤"}</span>
                    <span className={styles.queueCopy}>
                      <strong>{row.name}</strong>
                      <small>{formatLabel(row.experience_settings, t)} · {statusLabel(row.approval_status, t)}</small>
                      <small>{new Date(row.created_at).toLocaleDateString()}</small>
                    </span>
                    <span className={styles.queueArrow}>›</span>
                  </button>
                ))}
              </div>}
        </aside>

        <section className={styles.detailPanel}>
          {selected ? (
            <>
              <div className={styles.detailHeader}>
                <div>
                  <p className={styles.eyebrow}>{t("TÁC PHẨM ĐANG CHỌN", "SELECTED STORY")}</p>
                  <h2>{selected.name}</h2>
                  <p>{statusLabel(selected.approval_status, t)} · {formatLabel(selected.experience_settings, t)}</p>
                </div>
                <div className={styles.detailActions}>
                  <button type="button" onClick={() => void openPreview(selected)} disabled={previewLoading}>{previewLoading ? t("Đang mở...", "Opening...") : t("◉ Xem trước toàn màn hình", "◉ Full preview")}</button>
                  <Link href={"/admin/studio?mode=admin&garden=" + encodeURIComponent(selected.id)}>{t("Studio đầy đủ ↗", "Full Studio ↗")}</Link>
                  <button type="button" onClick={() => document.getElementById("admin-story-update")?.scrollIntoView({ behavior: "smooth", block: "center" })} className={storyDirty ? styles.updateActionDirty : undefined}>
                    {storyDirty ? "✦ " + t("Có thay đổi", "Changes") : "✎ " + t("Cập nhật", "Update")}
                  </button>
                </div>
              </div>

              <div className={styles.storyFacts}>
                <div><small>{t("Chủ sở hữu", "Owner")}</small><strong>{selected.owner_id === FAIRYTALE_GARDEN_ADMIN_USER_ID ? t("Admin", "Admin") : t("Tài khoản sáng tác", "Creator account")}</strong></div>
                <div><small>{t("Ngày tạo", "Created")}</small><strong>{new Date(selected.created_at).toLocaleDateString()}</strong></div>
                <div><small>{t("Xuất bản", "Published")}</small><strong>{selected.is_published ? t("Đang công khai", "Published") : t("Chưa xuất bản", "Not published")}</strong></div>
              </div>

              <section className={styles.storyEditor} id="admin-story-update">
                <div className={styles.editorHeading}>
                  <div><p className={styles.eyebrow}>{t("CHỈNH SỬA NỘI DUNG", "CONTENT EDITOR")}</p><h3>{t("Cập nhật tác phẩm", "Update story")}</h3><p>{t("Sửa thông tin và nội dung nhanh tại đây. Việc lưu không thay đổi trạng thái duyệt hoặc đường dẫn chia sẻ.", "Quickly edit story details here. Saving does not change its review status or share link.")}</p></div>
                  <span className={storyDirty ? styles.dirtyIndicator : styles.cleanIndicator}>{storyDirty ? "✦ " + t("Chưa lưu", "Unsaved") : "✓ " + t("Đã đồng bộ", "Synced")}</span>
                </div>
                {storyDraft && <>
                  <label className={styles.commentField}><span>{t("Tên tác phẩm", "Story title")}</span><input value={storyDraft.name} maxLength={120} onChange={(event) => setStoryDraft((draft) => draft ? { ...draft, name: event.target.value } : draft)} /></label>
                  <label className={styles.commentField}><span>{t("Lời giới thiệu", "Introduction")}</span><textarea rows={3} maxLength={1000} value={storyDraft.introduction} onChange={(event) => setStoryDraft((draft) => draft ? { ...draft, introduction: event.target.value } : draft)} /></label>
                  <label className={styles.commentField}><span>{t("Tiêu đề bức thư / nội dung chính", "Letter / main content title")}</span><input value={storyDraft.letterTitle} maxLength={180} onChange={(event) => setStoryDraft((draft) => draft ? { ...draft, letterTitle: event.target.value } : draft)} /></label>
                  <label className={styles.commentField}><span>{t("Nội dung chính · Mỗi đoạn cách nhau một dòng trống", "Main content · Separate paragraphs with a blank line")}</span><textarea rows={10} maxLength={30000} value={storyDraft.letterText} onChange={(event) => setStoryDraft((draft) => draft ? { ...draft, letterText: event.target.value } : draft)} /></label>
                  <label className={styles.commentField}><span>{t("Lời ký tên", "Signature")}</span><textarea rows={2} maxLength={500} value={storyDraft.letterSignature} onChange={(event) => setStoryDraft((draft) => draft ? { ...draft, letterSignature: event.target.value } : draft)} /></label>
                  <label className={styles.editorToggle}><input type="checkbox" checked={storyDraft.guestbookEnabled} onChange={(event) => setStoryDraft((draft) => draft ? { ...draft, guestbookEnabled: event.target.checked } : draft)} /><span>{t("Cho phép khách để lại lưu bút", "Allow visitors to leave a guestbook message")}</span></label>
                  <div className={styles.editorFooter}><small>{t("Các chương, ảnh, sticker và bố cục nâng cao có thể chỉnh trong Studio Admin đầy đủ.", "Chapters, photos, stickers and advanced layouts can be edited in Full Admin Studio.")}</small><button type="button" className={styles.updateButton} onClick={() => void saveStoryUpdates()} disabled={!storyDirty || saving}>{saving ? t("Đang cập nhật...", "Updating...") : "✦ " + t("Lưu cập nhật", "Save updates")}</button></div>
                </>}
              </section>

              {selected.review_comment && (
                <aside className={styles.previousFeedback}>
                  <strong>{t("Phản hồi đã lưu gần nhất", "Latest saved feedback")}</strong>
                  <p>{selected.review_comment}</p>
                  {selected.reviewed_at && <small>{new Date(selected.reviewed_at).toLocaleString()}</small>}
                </aside>
              )}

              <label className={styles.commentField}>
                <span>{t("Nhận xét cho người viết", "Feedback for the writer")}</span>
                <textarea value={comment} onChange={(event) => { if (selected) setCommentDrafts((current) => ({ ...current, [selected.id]: event.target.value })); }} rows={6} maxLength={3000} placeholder={t("Ghi nhận xét khi duyệt, hoặc nêu rõ lý do cần chỉnh sửa nếu từ chối...", "Add an optional approval note, or explain what needs to change if rejecting...")} />
                <small>{comment.length}/3000 · {t("Bắt buộc khi từ chối, tùy chọn khi duyệt.", "Required for rejection; optional for approval.")}</small>
              </label>

              <div className={styles.decisionBar}>
                <div><strong>{t("Quyết định kiểm duyệt", "Moderation decision")}</strong><p>{t("Duyệt không tự động xuất bản. Admin vẫn kiểm soát bước chia sẻ riêng.", "Approval does not publish automatically. Admin controls sharing separately.")}</p></div>
                <div className={styles.decisionButtons}>
                  <button type="button" className={styles.rejectButton} onClick={() => void moderate("rejected")} disabled={saving}>{saving ? t("Đang lưu...", "Saving...") : t("Từ chối & gửi lý do", "Reject with reason")}</button>
                  <button type="button" className={styles.approveButton} onClick={() => void moderate("approved")} disabled={saving}>{saving ? t("Đang lưu...", "Saving...") : t("Duyệt tác phẩm", "Approve story")}</button>
                </div>
              </div>
            </>
          ) : (
            <div className={styles.emptyDetail}><span>✧</span><h2>{t("Chọn một tác phẩm để bắt đầu", "Choose a story to begin")}</h2><p>{t("Danh sách bên trái sẽ hiển thị toàn bộ tác phẩm theo trạng thái kiểm duyệt.", "The queue on the left lists every story by review status.")}</p></div>
          )}
        </section>
      </section>

      <dialog ref={previewRef} className={styles.previewDialog} onClose={() => setPreview(null)} onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
        {preview && (
          <>
            <header className={styles.previewHeader}>
              <div><p>{t("BẢN XEM TRƯỚC · CHỈ ADMIN NHÌN THẤY", "PREVIEW · ADMIN ONLY")}</p><h2>{preview.name}</h2></div>
              <button type="button" onClick={closePreview}>{t("Đóng", "Close")} ✕</button>
            </header>
            <div className={styles.previewBody}>
              {preview.readOnlyStandalone ? (
                <FamilyLetterReader name={preview.name} introduction={preview.introduction} chapters={preview.chapters} photos={preview.photos} letterTitle={preview.letterTitle} letterParagraphs={preview.letterParagraphs} letterSignature={preview.letterSignature} embedded />
              ) : (
                <GardenJournal name={preview.name} introduction={preview.introduction} format={preview.format}
                  decorations={preview.decorations} coverUrl={preview.coverUrl} coverPath={preview.coverPath}
                  photos={preview.photos} chapters={preview.chapters} letterTitle={preview.letterTitle}
                  letterParagraphs={preview.letterParagraphs} letterSignature={preview.letterSignature}
                  embedded standalone returnHref="/admin/review" actionHref="#the-book"
                  actionLabel={preview.format === "book" ? "MỞ CUỐN SÁCH" : preview.format === "letter" ? "ĐỌC BỨC THƯ" : "ĐỌC THÔNG ĐIỆP"} />
              )}
            </div>
          </>
        )}
      </dialog>
    </main>
  );
}
