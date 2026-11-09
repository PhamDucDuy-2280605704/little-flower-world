"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PhotoLightbox from "@/features/garden/components/PhotoLightbox";
import FamilyLetterReader from "@/features/garden/components/FamilyLetterReader";
import GardenJournal, {
  normalizeStoryDecorations,
  type GardenJournalPhoto,
  type JournalChapter,
  type StoryFormat,
  type StoryDecorations,
} from "@/features/garden/components/GardenJournal";
import { adminSupabase } from "@/lib/adminSupabase";
import {
  FAIRYTALE_GARDEN_ADMIN_USER_ID,
  FAIRYTALE_TEST_GARDEN_ID,
} from "@/features/garden/data/gardenThemes";
import styles from "../styles/AdminDashboard.module.css";
import { useLanguage } from "@/features/i18n/LanguageProvider";

const BUCKET = "garden-photos";
const LEGACY_TEST_FOLDER = "be6c9d98-2b4e-46a9-a6a0-30b4bbadc6b0";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_PHOTOS = 40;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

type GardenRow = {
  id: string;
  owner_id: string;
  name: string;
  introduction: string | null;
  created_at: string;
  approval_status: "draft" | "pending" | "approved" | "rejected";
  garden_chapters: Array<{ chapter_id: string }> | null;
};

type Garden = {
  id: string;
  ownerId: string;
  name: string;
  introduction: string;
  createdAt: string;
  chapterCount: number;
  photoCount: number;
  approvalStatus: "draft" | "pending" | "approved" | "rejected";
};

type Photo = {
  path: string;
  url: string;
  name: string;
  createdAt: string;
};
type AdminStoryPreview = {
  id: string;
  name: string;
  introduction: string;
  format: StoryFormat;
  decorations: StoryDecorations;
  coverUrl: string | null;
  coverPath: string | null;
  photos: GardenJournalPhoto[];
  chapters: JournalChapter[];
  letterTitle: string;
  letterParagraphs: string[];
  letterSignature: string;
  readOnlyStandalone: boolean;
};

function photoFolders(gardenId: string): string[] {
  return gardenId === FAIRYTALE_TEST_GARDEN_ID
    ? [gardenId, LEGACY_TEST_FOLDER]
    : [gardenId];
}

function imageMimeType(fileName: string, declaredMimeType?: string | null): string | null {
  const mimeType = declaredMimeType?.toLowerCase() ?? "";
  if (ALLOWED_TYPES.has(mimeType)) return mimeType;
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  const byExtension: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    avif: "image/avif",
  };
  return byExtension[extension] ?? null;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const storyPreviewRef = useRef<HTMLDialogElement>(null);
  const [storyPreview, setStoryPreview] = useState<AdminStoryPreview | null>(null);
  const [storyPreviewLoading, setStoryPreviewLoading] = useState(false);
  const [authState, setAuthState] = useState<"checking" | "admin" | "denied">("checking");
  const [userEmail, setUserEmail] = useState("");
  const [gardens, setGardens] = useState<Garden[]>([]);
  const [selectedGardenId, setSelectedGardenId] = useState("");
  const [gardensLoading, setGardensLoading] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;

    void adminSupabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;

      const currentUser = data.session?.user;
      if (sessionError || !currentUser || currentUser.id !== FAIRYTALE_GARDEN_ADMIN_USER_ID) {
        setAuthState("denied");
        return;
      }

      setUserEmail(currentUser.email ?? "Admin");
      setAuthState("admin");
    }).catch((sessionError: unknown) => {
      console.error("Admin session check failed:", sessionError);
      if (active) setAuthState("denied");
    });

    return () => {
      active = false;
    };
  }, []);

  const loadGardens = useCallback(async () => {
    setGardensLoading(true);
    setError("");

    try {
      const { data, error: gardenError } = await adminSupabase
        .from("gardens")
        .select("id, owner_id, name, introduction, created_at, approval_status, garden_chapters(chapter_id)")
        .order("created_at", { ascending: false });

      if (gardenError) throw gardenError;

      const rows = (data ?? []) as unknown as GardenRow[];
      const results = await Promise.all(rows.map(async (row) => {
        const folderResults = await Promise.all(photoFolders(row.id).map(async (folder) => {
          const { data: files, error: listError } = await adminSupabase.storage
            .from(BUCKET)
            .list(folder, { limit: MAX_PHOTOS });
          if (listError) {
            console.error("Count garden photos failed:", listError);
            return 0;
          }
          return (files ?? []).filter((file) =>
            file.id && imageMimeType(file.name, file.metadata?.mimetype)
          ).length;
        }));

        return {
          id: row.id,
          ownerId: row.owner_id,
          name: row.name,
          introduction: row.introduction ?? "",
          createdAt: row.created_at,
          chapterCount: row.garden_chapters?.length ?? 0,
          photoCount: folderResults.reduce((sum, count) => sum + count, 0),
          approvalStatus: row.approval_status,
        } satisfies Garden;
      }));

      setGardens(results);
      setSelectedGardenId((current) =>
        results.some((garden) => garden.id === current)
          ? current
          : results[0]?.id ?? ""
      );
    } catch (loadError) {
      console.error("Load all gardens failed:", loadError);
      setError(t("Chưa tải được danh sách tác phẩm. Anh thử tải lại trang nhé.", "Could not load stories. Please reload the page."));
    } finally {
      setGardensLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (authState === "admin") {
      // Intentional async Supabase read; state updates follow the network response.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadGardens();
    }
  }, [authState, loadGardens]);

  const selectedGarden = gardens.find((garden) => garden.id === selectedGardenId) ?? null;

  const loadAlbum = useCallback(async (garden: Garden) => {
    setPhotosLoading(true);
    setError("");
    setNotice("");

    try {
      const listings = await Promise.all(photoFolders(garden.id).map(async (folder) => {
        const { data, error: listError } = await adminSupabase.storage
          .from(BUCKET)
          .list(folder, {
            limit: MAX_PHOTOS,
            sortBy: { column: "created_at", order: "desc" },
          });
        return { folder, data, error: listError };
      }));

      const failed = listings.find((listing) => listing.error);
      if (failed?.error) throw failed.error;

      const records = listings.flatMap(({ folder, data }) =>
        (data ?? [])
          .filter((file) => file.name && file.id && imageMimeType(file.name, file.metadata?.mimetype))
          .map((file) => ({
            path: folder + "/" + file.name,
            name: file.name,
            createdAt: file.created_at ?? "",
          }))
      );

      const signedResults = await Promise.all(records.map(async (record) => {
        const { data, error: signedError } = await adminSupabase.storage
          .from(BUCKET)
          .createSignedUrl(record.path, 60 * 60);
        if (signedError || !data?.signedUrl) return { photo: null, error: signedError };
        return { photo: { ...record, url: data.signedUrl } as Photo, error: null };
      }));

      const sorted = signedResults
        .map((result) => result.photo)
        .filter((photo): photo is Photo => photo !== null)
        .sort((a, b) =>
          (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)
        )
        .slice(0, MAX_PHOTOS);

      setPhotos(sorted);
      if (signedResults.some((result) => result.error || !result.photo)) {
        setError(t("Một số ảnh chưa tạo được liên kết xem. Anh kiểm tra quyền Storage hoặc tải lại album nhé.", "Some photos could not be signed for viewing. Check Storage access or reload the album."));
      }
    } catch (loadError) {
      console.error("Load garden album failed:", loadError);
      setPhotos([]);
      setError(t("Không tải được kho ảnh của tác phẩm này. Hãy thử tải lại.", "Could not load this story's photo library. Please try again."));
    } finally {
      setPhotosLoading(false);
    }
  }, [t]);

  async function openStoryPreview(garden: Garden) {
    setSelectedGardenId(garden.id);
    setStoryPreviewLoading(true);
    setError("");
    try {
      const [gardenResult, chapterResult] = await Promise.all([
        adminSupabase.from("gardens")
          .select("id,name,introduction,letter_title,letter_paragraphs,letter_signature,experience_settings,cover_path")
          .eq("id", garden.id).single(),
        adminSupabase.from("garden_chapters")
          .select("chapter_id,sort_order,title,paragraphs")
          .eq("garden_id", garden.id).order("sort_order", { ascending: true }),
      ]);
      if (gardenResult.error) throw gardenResult.error;
      if (chapterResult.error) throw chapterResult.error;

      const row = gardenResult.data;
      const settings = (row.experience_settings ?? {}) as Record<string, unknown>;
      const formatSetting = settings.storyFormat;
      const format: StoryFormat = formatSetting === "message" || formatSetting === "letter" ? formatSetting : "book";
      const photosFolders = await Promise.all(photoFolders(garden.id).map(async (folder) => {
        const { data, error: listError } = await adminSupabase.storage.from(BUCKET).list(folder, {
          limit: MAX_PHOTOS, sortBy: { column: "created_at", order: "desc" },
        });
        if (listError) throw listError;
        return (data ?? [])
          .filter((file) => file.name && file.id && ALLOWED_TYPES.has(file.metadata?.mimetype ?? ""))
          .map((file) => ({ path: folder + "/" + file.name, name: file.name, createdAt: file.created_at ?? "" }));
      }));
      const photoRecords = photosFolders.flat().sort((a, b) =>
        (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0),
      ).slice(0, MAX_PHOTOS);
      const coverRecord = row.cover_path
        ? photoRecords.find((photo) => photo.path === row.cover_path) ?? null
        : null;
      const orderedPhotoRecords = coverRecord
        ? [coverRecord, ...photoRecords.filter((photo) => photo.path !== coverRecord.path)]
        : photoRecords;
      const inlinePhotoAlts = Array.isArray(settings.inlinePhotoAlts)
        ? settings.inlinePhotoAlts.filter((alt): alt is string => typeof alt === "string")
        : [];
      const todayPhotoAlt = inlinePhotoAlts.find((alt) => alt.toLowerCase().includes("hôm nay"))
        ?? "Ảnh gia đình hôm nay";
      const oldPhotoAlt = inlinePhotoAlts.find((alt) => alt.toLowerCase().includes("ngày trước"))
        ?? "Bức ảnh gia đình ngày trước";
      const [signedPhotos, coverResult] = await Promise.all([
        Promise.all(orderedPhotoRecords.map(async (photo, index) => {
          const { data, error: signedError } = await adminSupabase.storage.from(BUCKET).createSignedUrl(photo.path, 60 * 60);
          if (signedError || !data?.signedUrl) return null;
          const isCover = Boolean(coverRecord && photo.path === coverRecord.path);
          const alt = settings.readOnlyStandalone === true
            ? (coverRecord ? (isCover ? todayPhotoAlt : oldPhotoAlt) : (index === 0 ? todayPhotoAlt : oldPhotoAlt))
            : t("Ảnh trong ", "Photo in ") + row.name;
          return { path: photo.path, url: data.signedUrl, alt };
        })),
        row.cover_path
          ? adminSupabase.storage.from(BUCKET).createSignedUrl(row.cover_path, 60 * 60)
          : Promise.resolve({ data: null, error: null }),
      ]);
      const chapterRows = chapterResult.data ?? [];
      const letterParagraphs = Array.isArray(row.letter_paragraphs)
        ? row.letter_paragraphs.filter((item): item is string => typeof item === "string") : [];
      setStoryPreview({
        id: row.id,
        name: row.name,
        introduction: row.introduction ?? "",
        format,
        decorations: normalizeStoryDecorations(settings.storyDecorations),
        coverUrl: coverResult.data?.signedUrl ?? null,
        coverPath: row.cover_path ?? null,
        photos: signedPhotos.filter((photo): photo is GardenJournalPhoto => photo !== null),
        chapters: chapterRows.map((chapter) => ({
          id: chapter.chapter_id,
          title: chapter.title,
          paragraphs: Array.isArray(chapter.paragraphs)
            ? chapter.paragraphs.filter((item): item is string => typeof item === "string") : [],
        })),
        letterTitle: row.letter_title ?? t("Một lá thư dành riêng cho bạn", "A letter just for you"),
        letterParagraphs,
        letterSignature: row.letter_signature ?? "",
        readOnlyStandalone: settings.readOnlyStandalone === true,
      });
    } catch (previewError) {
      console.error("Load full story preview failed:", previewError);
      setError(t("Chưa mở được toàn bộ tác phẩm. Anh thử lại nhé.", "Could not open the full story. Please try again."));
      setStoryPreview(null);
    } finally {
      setStoryPreviewLoading(false);
    }
  }

  const closeStoryPreview = useCallback(() => {
    const dialog = storyPreviewRef.current;
    if (dialog?.open) dialog.close();
    setStoryPreview(null);
  }, []);

  useEffect(() => {
    const dialog = storyPreviewRef.current;
    if (!dialog) return;
    if (storyPreview && !dialog.open) {
      try {
        dialog.showModal();
      } catch (dialogError) {
        console.error("Open Admin story preview failed:", dialogError);
      }
    } else if (!storyPreview && dialog.open) {
      dialog.close();
    }
  }, [storyPreview]);

  useEffect(() => {
    if (authState !== "admin" || !selectedGardenId) return;
    const garden = gardens.find((item) => item.id === selectedGardenId);
    if (garden) {
      // Intentional async Storage read; state updates follow the request.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadAlbum(garden);
    }
  }, [authState, selectedGardenId, gardens, loadAlbum]);

  const filteredGardens = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("vi");
    if (!query) return gardens;
    return gardens.filter((garden) =>
      (garden.name + " " + garden.introduction).toLocaleLowerCase("vi").includes(query)
    );
  }, [gardens, search]);

  const totalPhotos = gardens.reduce((sum, garden) => sum + garden.photoCount, 0);
  const totalChapters = gardens.reduce((sum, garden) => sum + garden.chapterCount, 0);
  const pendingApprovalCount = gardens.filter((garden) => garden.approvalStatus === "pending").length;

  async function uploadFiles(files: File[]) {
    const garden = selectedGarden;
    if (!garden || files.length === 0 || uploading) return;

    setError("");
    setNotice("");

    if (photos.length + files.length > MAX_PHOTOS) {
      setError(t("Mỗi tác phẩm lưu tối đa ", "A story can hold up to ") + MAX_PHOTOS + t(" ảnh nhé anh.", " photos."));
      return;
    }

    const invalid = files.find((file) =>
      !imageMimeType(file.name, file.type) || file.size <= 0 || file.size > MAX_FILE_SIZE
    );
    if (invalid) {
      setError(t("Ảnh cần là JPG, PNG, WEBP, GIF hoặc AVIF, có dữ liệu và không quá 10 MB mỗi ảnh.", "Photos must be valid JPG, PNG, WEBP, GIF, or AVIF files with data and no larger than 10 MB each."));
      return;
    }

    setUploading(true);
    let uploadedCount = 0;
    const failures: string[] = [];

    try {
      for (const file of files) {
        const mimeType = imageMimeType(file.name, file.type);
        if (!mimeType) {
          failures.push(file.name + ": " + t("định dạng không hợp lệ.", "unsupported format."));
          continue;
        }
        const safeName = file.name
          .normalize("NFKD")
          .replace(/[^a-zA-Z0-9._-]/g, "-")
          .replace(/-+/g, "-")
          .slice(-80);
        const path = garden.id + "/" + crypto.randomUUID() + "-" + (safeName || "photo");
        try {
          const { error: uploadError } = await adminSupabase.storage
            .from(BUCKET)
            .upload(path, file, {
              cacheControl: "3600",
              contentType: mimeType,
              upsert: false,
            });
          if (uploadError) {
            console.error("Upload garden photo failed:", uploadError);
            failures.push(file.name + ": " + uploadError.message);
          } else {
            uploadedCount += 1;
          }
        } catch (uploadError) {
          console.error("Unexpected Admin photo upload failure:", uploadError);
          failures.push(file.name + ": " + t("lỗi kết nối khi tải lên.", "network error during upload."));
        }
      }

      if (uploadedCount > 0) {
        await loadGardens();
        await loadAlbum(garden);
        setNotice(uploadedCount === 1
          ? t("Đã thêm ảnh vào kho của tác phẩm 🌷", "Photo added to the story library 🌷")
          : t("Đã thêm ", "Added ") + uploadedCount + t(" ảnh vào kho 🌷", " photos to the library 🌷"));
      }
      if (failures.length > 0) {
        setError(failures.slice(0, 4).join(" "));
      }
    } catch (uploadFailure) {
      console.error("Admin album upload failed:", uploadFailure);
      setError(t("Không thể hoàn tất tải ảnh. Hãy kiểm tra kết nối rồi thử lại.", "Could not finish uploading photos. Check your connection and try again."));
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    void uploadFiles(files);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length > 0) {
      void uploadFiles(Array.from(event.dataTransfer.files));
    }
  }

  async function deletePhoto(photo: Photo) {
    if (!window.confirm(t("Xoá ảnh này khỏi kho của tác phẩm?", "Delete this photo from the story library?"))) return;

    setError("");
    setNotice("");
    const { error: deleteError } = await adminSupabase.storage
      .from(BUCKET)
      .remove([photo.path]);

    if (deleteError) {
      console.error("Delete garden photo failed:", deleteError);
      setError(t("Chưa xoá được ảnh. Bạn thử lại nhé.", "Could not delete the photo. Please try again."));
      return;
    }

    setPhotos((current) => current.filter((item) => item.path !== photo.path));
    setNotice(t("Đã xoá ảnh khỏi kho của tác phẩm.", "Photo deleted from the story library."));
    await loadGardens();
  }

  async function handleLogout() {
    const { error: logoutError } = await adminSupabase.auth.signOut({ scope: "local" });
    if (logoutError) {
      setError(t("Đăng xuất chưa thành công. Anh thử lại nhé.", "Sign out failed. Please try again."));
      return;
    }
    router.replace("/little-story-backstage-7f4c");
  }

  if (authState === "checking") {
    return (
      <main className={styles.loadingPage}>
        <div className={styles.loadingMark}>▤</div>
        <p>{t("Đang mở không gian quản lý...", "Opening the management workspace...")}</p>
      </main>
    );
  }

  if (authState !== "admin") {
    return (
      <main className={styles.deniedPage}>
        <div className={styles.deniedCard}>
          <span className={styles.deniedMark}>▤</span>
          <p className={styles.eyebrow}>LITTLE STORY WORLD</p>
          <h1>{t("Khu vực dành riêng cho Admin", "Private Admin area")}</h1>
          <p>{t("Anh cần đăng nhập bằng tài khoản quản trị để mở trung tâm này.", "Sign in with an administrator account to open this center.")}</p>
          <Link href="/little-story-backstage-7f4c" className={styles.primaryLink}>{t("Đăng nhập quản trị", "Admin sign-in")}</Link>
          <Link href="/" className={styles.backLink}>{t("Về trang chủ", "Back to home")}</Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.shell}>
      <div className={styles.orbOne} />
      <div className={styles.orbTwo} />
      <div className={styles.app}>
        <aside className={styles.sidebar}>
          <Link href="/" className={styles.brand}>
            <span className={styles.brandMark}>▤</span>
            <span>
              <strong>Little Story</strong>
              <small>WORLD STUDIO</small>
            </span>
          </Link>

          <div className={styles.sidebarSection}>
            <p className={styles.sidebarLabel}>{t("KHU VỰC QUẢN TRỊ", "ADMIN AREA")}</p>
            <a href="#overview" className={styles.sideLinkActive}>⌂ <span>{t("Tổng quan", "Overview")}</span></a>
            <a href="#garden-list" className={styles.sideLink}>▤ <span>{t("Quản lý tác phẩm", "Story management")}</span></a>
            <a href="#photo-library" className={styles.sideLink}>▧ <span>{t("Kho ảnh riêng", "Photo library")}</span></a>
            <Link href="/admin/review" className={styles.sideLink}>✓ <span>{t("Bàn kiểm duyệt", "Review desk")}</Link>
            <Link href="/admin/studio?mode=admin" className={styles.sideLink}>✎ <span>{t("Studio Admin đầy đủ", "Full Admin studio")}</span></Link>
            <Link href="/" className={styles.sideLink}>⌂ <span>{t("Trang chủ", "Home")}</span></Link>
          </div>

          <div className={styles.sidebarBottom}>
            <div className={styles.avatar}>D</div>
            <div className={styles.accountCopy}>
              <strong>Story Admin</strong>
              <span>{userEmail}</span>
            </div>
            <span className={styles.adminDot} title={t("Admin đang hoạt động", "Admin is active")} />
          </div>
        </aside>

        <div className={styles.main}>
          <header className={styles.topbar}>
            <div>
              <p className={styles.eyebrow}>{t("KHU VỰC QUẢN TRỊ", "ADMIN AREA")} <span>·</span> ADMIN CENTER</p>
              <h1>{t("Trung tâm quản lý", "Admin center")}</h1>
              <p className={styles.subtitle}>{t("Mỗi tác phẩm có một album riêng, mọi kỷ niệm đều ở đúng nơi.", "Every story has its own album, keeping each memory in the right place.")}</p>
            </div>
            <div className={styles.topActions}>
              <Link href="/admin/review" className={styles.secondaryLink}>{t("Mở bàn kiểm duyệt", "Open review desk")}</Link>
              <Link href="/admin/studio?mode=admin" className={styles.secondaryLink}>{t("Studio Admin", "Admin studio")}</Link>
              <button type="button" className={styles.logoutButton} onClick={() => void handleLogout()}>{t("Đăng xuất", "Sign out")}</button>
            </div>
          </header>

          <section className={styles.hero} id="overview">
            <div className={styles.heroCopy}>
              <span className={styles.heroTag}>✦ YOUR PRIVATE WORKSPACE</span>
              <h2>{t("Quản lý những câu chuyện,", "Manage every story,")}<br /><em>{t("lưu giữ từng khoảnh khắc.", "keep every moment.")}</em></h2>
              <p>{t("Chọn một tác phẩm bên dưới để quản lý kho ảnh và nội dung đã lưu.", "Select a story below to review its content and photo library.")}</p>
            </div>
            <div className={styles.heroArt} role="img" aria-label={t("Ảnh một cuốn sách mở trên bàn dưới ánh sáng tự nhiên", "An open book on a desk in natural light")} />
          </section>

          <section className={styles.stats} aria-label={t("Thống kê", "Statistics")}>
            <article className={styles.statCard}>
              <span className={styles.statIcon}>▤</span>
              <div><strong>{gardens.length}</strong><span>{t("Tác phẩm", "Stories")}</span></div>
            </article>
            <article className={styles.statCard}>
              <span className={styles.statIcon}>▧</span>
              <div><strong>{totalPhotos}</strong><span>{t("Ảnh đã lưu", "Photos saved")}</span></div>
            </article>
            <article className={styles.statCard}>
              <span className={styles.statIcon}>✧</span>
              <div><strong>{totalChapters}</strong><span>{t("Chương truyện", "Chapters")}</span></div>
            </article>
            <article className={styles.statCard}>
              <span className={styles.statIcon}>◷</span>
              <div><strong>{pendingApprovalCount}</strong><span>{t("Chờ Admin duyệt", "Awaiting review")}</span></div>
            </article>
          </section>

          {error && <p className={styles.errorBanner} role="alert">{error}</p>}
          {notice && <p className={styles.noticeBanner} role="status">{notice}</p>}

          <section className={styles.workspace} id="garden-list">
            <div className={styles.gardenPanel}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.panelEyebrow}>{t("BỘ SƯU TẬP TÁC PHẨM", "STORY COLLECTION")}</p>
                  <h2>{t("Các tác phẩm", "Stories")}</h2>
                  <p>{t("Chọn tác phẩm anh muốn quản lý.", "Choose a story to manage.")}</p>
                </div>
                <span className={styles.countPill}>{gardens.length} {t("tác phẩm", "stories")}</span>
              </div>

              <label className={styles.searchBox}>
                <span>⌕</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("Tìm tác phẩm...", "Search stories...")}
                  aria-label={t("Tìm tác phẩm", "Search stories")}
                />
              </label>

              {gardensLoading ? (
                <div className={styles.panelEmpty}>{t("Đang tải danh sách tác phẩm...", "Loading stories...")}</div>
              ) : filteredGardens.length === 0 ? (
                <div className={styles.panelEmpty}>{t("Không tìm thấy tác phẩm phù hợp.", "No matching stories found.")}</div>
              ) : (
                <div className={styles.gardenList}>
                  {filteredGardens.map((garden, index) => {
                    const selected = garden.id === selectedGardenId;
                    const isTestGarden = garden.id === FAIRYTALE_TEST_GARDEN_ID;
                    return (
                      <button
                        key={garden.id}
                        type="button"
                        className={selected ? styles.gardenCardActive : styles.gardenCard}
                        onClick={() => void openStoryPreview(garden)}
                      >
                        <span className={styles.gardenThumb}>
                          {isTestGarden ? "▤" : "▤"}
                          <i>{String(index + 1).padStart(2, "0")}</i>
                        </span>
                        <span className={styles.gardenInfo}>
                          <strong>{garden.name}</strong>
                          <small>{garden.ownerId === FAIRYTALE_GARDEN_ADMIN_USER_ID ? t("Tác phẩm của Admin", "Admin story") : t("Tác phẩm khách", "Writer story")} · {garden.approvalStatus === "pending" ? t("Chờ duyệt", "Pending") : garden.approvalStatus === "approved" ? t("Đã duyệt", "Approved") : garden.approvalStatus === "rejected" ? t("Cần chỉnh sửa", "Needs changes") : t("Bản nháp", "Draft")}</small>
                          <span>{garden.photoCount} {t("ảnh", "photos")} <b>·</b> {garden.chapterCount} {t("chương", "chapters")}</span>
                        </span>
                        <span className={styles.gardenArrow}>›</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <section className={styles.albumPanel} id="photo-library">
              {selectedGarden ? (
                <>
                  <div className={styles.albumHeader}>
                    <div>
                      <p className={styles.panelEyebrow}>{t("THƯ VIỆN ẢNH", "PHOTO LIBRARY")}</p>
                      <h2>{selectedGarden.name}</h2>
                      <p>{selectedGarden.introduction || t("Khoảnh khắc của tác phẩm này.", "Moments from this story.")}</p>
                    </div>
                    <div className={styles.storyActions}>
                      <button type="button" onClick={() => void openStoryPreview(selectedGarden)} disabled={storyPreviewLoading}>
                        {storyPreviewLoading ? t("Đang mở tác phẩm...", "Opening story...") : t("Đọc toàn bộ tác phẩm ↗", "Read full story ↗")}
                      </button>
                      <Link href={"/admin/studio?mode=admin&garden=" + encodeURIComponent(selectedGarden.id)}>Mở trình chỉnh sửa</Link>
                      <span className={styles.albumCount}>{photos.length} / {MAX_PHOTOS} {t("ảnh", "photos")}</span>
                    </div>
                  </div>

                  <div
                    className={dragging ? styles.dropzoneActive : styles.dropzone}
                    onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                    onDragLeave={(event) => {
                      if (event.currentTarget === event.target) setDragging(false);
                    }}
                    onDrop={handleDrop}
                  >
                    <span className={styles.uploadMark}>↑</span>
                    <strong>{uploading ? t("Đang đưa ảnh vào tác phẩm...", "Uploading photos to the story...") : t("Thêm kỷ niệm vào tác phẩm", "Add memories to this story")}</strong>
                    <p>{t("Kéo ảnh thả vào đây hoặc chọn trực tiếp từ máy tính.", "Drop photos here or choose them from your computer.")}</p>
                    <label className={styles.uploadButton}>
                      {t("Chọn ảnh từ máy", "Choose photos")}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                        multiple
                        onChange={handleFileChange}
                        disabled={uploading || photos.length >= MAX_PHOTOS}
                      />
                    </label>
                    <small>{t("JPG · PNG · WEBP · GIF · AVIF · tối đa 10 MB/ảnh", "JPG · PNG · WEBP · GIF · AVIF · up to 10 MB/photo")}</small>
                  </div>

                  <div className={styles.photoToolbar}>
                    <div>
                      <h3>{t("Ảnh trong tác phẩm", "Story photos")}</h3>
                      <p>{t("Chỉ những ảnh thuộc tác phẩm đang chọn được hiển thị ở đây.", "Only photos belonging to the selected story appear here.")}</p>
                    </div>
                    <span>{photos.length} {t("tệp", "files")}</span>
                  </div>

                  {photosLoading ? (
                    <div className={styles.photoEmpty}>{t("Đang mở kho ảnh...", "Opening photo library...")}</div>
                  ) : photos.length === 0 ? (
                    <div className={styles.photoEmpty}>
                      <span>▤</span>
                      <strong>{t("Kho ảnh còn trống", "Photo library is empty")}</strong>
                      <p>{t("Thêm bức ảnh đầu tiên để lưu giữ kỷ niệm ở tác phẩm này.", "Add the first photo to keep a memory in this story.")}</p>
                    </div>
                  ) : (
                    <div className={styles.photoGrid}>
                      {photos.map((photo) => (
                        <figure className={styles.photoCard} key={photo.path}>
                          <button
                            type="button"
                            className={styles.photoOpenButton}
                            onClick={() => setActivePhotoIndex(photos.findIndex((item) => item.path === photo.path))}
                            aria-label={t("Phóng to ảnh trong kho", "Enlarge library photo")}
                            title={t("Bấm để xem ảnh lớn", "Click to enlarge photo")}
                          >
                            <Image src={photo.url} alt={t("Ảnh trong ", "Photo in ") + selectedGarden.name} width={960} height={720} sizes="(max-width: 600px) 50vw, 25vw" unoptimized loading="lazy" />
                            <span aria-hidden="true">⌕</span>
                          </button>
                          <figcaption>
                            <span>{photo.name.replace(/^[0-9a-f-]{36}-/i, "")}</span>
                            <button
                              type="button"
                              onClick={() => void deletePhoto(photo)}
                              aria-label={t("Xoá ảnh", "Delete photo")}
                              title={t("Xoá ảnh", "Delete photo")}
                            >×</button>
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.photoEmpty}>
                  <span>▤</span>
                  <strong>{t("Chọn một tác phẩm", "Choose a story")}</strong>
                  <p>{t("Kho ảnh riêng sẽ mở ở đây.", "The story's private photo library will appear here.")}</p>
                </div>
              )}
            </section>
          </section>

          <footer className={styles.footer}>
            <span>▤ Little Story World</span>
            <span>{t("Quản lý riêng tư · Mỗi tác phẩm một album", "Private management · One album per story")}</span>
          </footer>
        </div>
      </div>
      <dialog ref={storyPreviewRef}
        className={storyPreview?.readOnlyStandalone
          ? styles.storyPreviewDialog + " " + styles.storyPreviewDialogLetter
          : styles.storyPreviewDialog}
        aria-label={t("Xem toàn bộ tác phẩm", "Read complete story")}
        onClose={() => setStoryPreview(null)}
        onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
        {storyPreview && <>
          <div className={styles.storyPreviewToolbar}>
            <div><strong>{storyPreview.name}</strong><span>{selectedGarden?.approvalStatus === "pending" ? "Đang chờ duyệt" : selectedGarden?.approvalStatus === "approved" ? t("Đã duyệt", "Approved") : selectedGarden?.approvalStatus === "rejected" ? t("Cần chỉnh sửa", "Needs changes") : t("Bản nháp", "Draft")}</span></div>
            <div>
              <Link href={"/admin/studio?mode=admin&garden=" + encodeURIComponent(storyPreview.id)}>{t("Mở chỉnh sửa & kiểm duyệt ↗", "Edit & review ↗")}</Link>
              <button type="button" onClick={closeStoryPreview} aria-label={t("Đóng bản xem trước", "Close preview")}>{t("Đóng ✕", "Close ✕")}</button>
            </div>
          </div>
          <div className={storyPreview.readOnlyStandalone
            ? styles.storyPreviewBody + " " + styles.storyPreviewBodyLetter
            : styles.storyPreviewBody}>
            {storyPreview.readOnlyStandalone ? (
              <FamilyLetterReader
                name={storyPreview.name}
                introduction={storyPreview.introduction}
                chapters={storyPreview.chapters}
                photos={storyPreview.photos}
                letterTitle={storyPreview.letterTitle}
                letterParagraphs={storyPreview.letterParagraphs}
                letterSignature={storyPreview.letterSignature}
                embedded
              />
            ) : (
              <GardenJournal
                key={storyPreview.id}
                name={storyPreview.name}
                introduction={storyPreview.introduction}
                format={storyPreview.format}
                decorations={storyPreview.decorations}
                coverUrl={storyPreview.coverUrl}
                coverPath={storyPreview.coverPath}
                photos={storyPreview.photos}
                chapters={storyPreview.chapters}
                readIds={[]}
                letterTitle={storyPreview.letterTitle}
                letterParagraphs={storyPreview.letterParagraphs}
                letterSignature={storyPreview.letterSignature}
                letterReady={storyPreview.letterParagraphs.length > 0}
                returnHref="/admin"
                returnLabel={t("Quay lại trung tâm Admin", "Back to Admin center")}
                actionHref="#the-book"
                actionLabel={t("ĐỌC TÁC PHẨM", "READ STORY")}
              />
            )}
          </div>
        </>}
      </dialog>
      <PhotoLightbox
        images={photos.map((photo) => ({ url: photo.url, alt: photo.name }))}
        activeIndex={activePhotoIndex}
        onClose={() => setActivePhotoIndex(null)}
        onChange={setActivePhotoIndex}
      />
    </main>
  );
}
