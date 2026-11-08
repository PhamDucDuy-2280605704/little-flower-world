"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PhotoLightbox from "@/features/garden/components/PhotoLightbox";
import { adminSupabase } from "@/lib/adminSupabase";
import {
  FAIRYTALE_GARDEN_ADMIN_USER_ID,
  FAIRYTALE_TEST_GARDEN_ID,
} from "@/features/garden/data/gardenThemes";
import styles from "../styles/AdminDashboard.module.css";

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

function photoFolders(gardenId: string): string[] {
  return gardenId === FAIRYTALE_TEST_GARDEN_ID
    ? [gardenId, LEGACY_TEST_FOLDER]
    : [gardenId];
}

export default function AdminDashboard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
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

    const { data, error: gardenError } = await adminSupabase
      .from("gardens")
      .select("id, owner_id, name, introduction, created_at, approval_status, garden_chapters(chapter_id)")
      .order("created_at", { ascending: false });

    if (gardenError) {
      console.error("Load all gardens failed:", gardenError);
      setError("Chưa tải được danh sách tác phẩm. Anh thử tải lại trang nhé.");
      setGardensLoading(false);
      return;
    }

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
        return (files ?? []).filter((file) => file.id && ALLOWED_TYPES.has(file.metadata?.mimetype ?? "")).length;
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
    setGardensLoading(false);
  }, []);

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
    if (failed?.error) {
      console.error("Load garden album failed:", failed.error);
      setError("Không tải được kho ảnh của tác phẩm này.");
      setPhotos([]);
      setPhotosLoading(false);
      return;
    }

    const records = listings.flatMap(({ folder, data }) =>
      (data ?? [])
        .filter((file) => file.name && file.id && ALLOWED_TYPES.has(file.metadata?.mimetype ?? ""))
        .map((file) => ({
          path: folder + "/" + file.name,
          name: file.name,
          createdAt: file.created_at ?? "",
        }))
    );

    const signedPhotos = await Promise.all(records.map(async (record) => {
      const { data, error: signedError } = await adminSupabase.storage
        .from(BUCKET)
        .createSignedUrl(record.path, 60 * 60);
      if (signedError || !data?.signedUrl) return null;
      return { ...record, url: data.signedUrl };
    }));

    const sorted = signedPhotos
      .filter((photo): photo is Photo => photo !== null)
      .sort((a, b) =>
        (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)
      )
      .slice(0, MAX_PHOTOS);

    setPhotos(sorted);
    setPhotosLoading(false);
  }, []);

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
    if (!selectedGarden || files.length === 0 || uploading) return;

    setError("");
    setNotice("");

    if (photos.length + files.length > MAX_PHOTOS) {
      setError("Mỗi tác phẩm lưu tối đa " + MAX_PHOTOS + " ảnh nhé anh.");
      return;
    }

    const invalid = files.find((file) =>
      !ALLOWED_TYPES.has(file.type) || file.size > MAX_FILE_SIZE
    );
    if (invalid) {
      setError("Ảnh cần là JPG, PNG, WEBP, GIF hoặc AVIF và không quá 10 MB mỗi ảnh.");
      return;
    }

    setUploading(true);
    for (const file of files) {
      const safeName = file.name
        .normalize("NFKD")
        .replace(/[^a-zA-Z0-9._-]/g, "-")
        .replace(/-+/g, "-")
        .slice(-80);
      const path = selectedGarden.id + "/" + crypto.randomUUID() + "-" + (safeName || "photo");
      const { error: uploadError } = await adminSupabase.storage
        .from(BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload garden photo failed:", uploadError);
        setError('Không tải được ảnh "' + file.name + '". Anh thử lại nhé.');
        setUploading(false);
        await loadAlbum(selectedGarden);
        return;
      }
    }

    setUploading(false);
    setNotice(files.length === 1 ? "Đã thêm ảnh vào kho của tác phẩm 🌷" : "Đã thêm " + files.length + " ảnh vào kho 🌷");
    await loadAlbum(selectedGarden);
    await loadGardens();
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
    if (!window.confirm("Xoá ảnh này khỏi kho của tác phẩm?")) return;

    setError("");
    setNotice("");
    const { error: deleteError } = await adminSupabase.storage
      .from(BUCKET)
      .remove([photo.path]);

    if (deleteError) {
      console.error("Delete garden photo failed:", deleteError);
      setError("Chưa xoá được ảnh. Anh thử lại nhé.");
      return;
    }

    setPhotos((current) => current.filter((item) => item.path !== photo.path));
    setNotice("Đã xoá ảnh khỏi kho của tác phẩm.");
    await loadGardens();
  }

  async function handleLogout() {
    const { error: logoutError } = await adminSupabase.auth.signOut({ scope: "local" });
    if (logoutError) {
      setError("Đăng xuất chưa thành công. Anh thử lại nhé.");
      return;
    }
    router.replace("/admin/login");
  }

  if (authState === "checking") {
    return (
      <main className={styles.loadingPage}>
        <div className={styles.loadingMark}>▤</div>
        <p>Đang mở không gian quản lý...</p>
      </main>
    );
  }

  if (authState !== "admin") {
    return (
      <main className={styles.deniedPage}>
        <div className={styles.deniedCard}>
          <span className={styles.deniedMark}>▤</span>
          <p className={styles.eyebrow}>LITTLE STORY WORLD</p>
          <h1>Khu vực dành riêng cho Admin</h1>
          <p>Anh cần đăng nhập bằng tài khoản quản trị để mở trung tâm này.</p>
          <Link href="/admin/login" className={styles.primaryLink}>Đăng nhập Admin</Link>
          <Link href="/" className={styles.backLink}>Về trang chủ</Link>
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
            <p className={styles.sidebarLabel}>KHU VỰC QUẢN TRỊ</p>
            <a href="#overview" className={styles.sideLinkActive}>⌂ <span>Tổng quan</span></a>
            <a href="#garden-list" className={styles.sideLink}>▤ <span>Quản lý tác phẩm</span></a>
            <a href="#photo-library" className={styles.sideLink}>▧ <span>Kho ảnh riêng</span></a>
            <Link href="/studio?mode=admin" className={styles.sideLink}>✎ <span>Viết & kiểm duyệt</span></Link>
            <Link href="/" className={styles.sideLink}>⌂ <span>Trang chủ</span></Link>
          </div>

          <div className={styles.sidebarBottom}>
            <div className={styles.avatar}>D</div>
            <div className={styles.accountCopy}>
              <strong>Story Admin</strong>
              <span>{userEmail}</span>
            </div>
            <span className={styles.adminDot} title="Admin đang hoạt động" />
          </div>
        </aside>

        <div className={styles.main}>
          <header className={styles.topbar}>
            <div>
              <p className={styles.eyebrow}>KHU VỰC QUẢN TRỊ <span>·</span> ADMIN CENTER</p>
              <h1>Trung tâm quản lý</h1>
              <p className={styles.subtitle}>Mỗi tác phẩm có một album riêng, mọi kỷ niệm đều ở đúng nơi.</p>
            </div>
            <div className={styles.topActions}>
              <Link href="/studio?mode=admin" className={styles.secondaryLink}>Mở không gian viết & kiểm duyệt</Link>
              <button type="button" className={styles.logoutButton} onClick={() => void handleLogout()}>Đăng xuất</button>
            </div>
          </header>

          <section className={styles.hero} id="overview">
            <div className={styles.heroCopy}>
              <span className={styles.heroTag}>✦ YOUR PRIVATE WORKSPACE</span>
              <h2>Quản lý những câu chuyện,<br /><em>lưu giữ từng khoảnh khắc.</em></h2>
              <p>Chọn một tác phẩm bên dưới để quản lý kho ảnh và nội dung đã lưu.</p>
            </div>
            <div className={styles.heroArt} role="img" aria-label="Ảnh một cuốn sách mở trên bàn dưới ánh sáng tự nhiên" />
          </section>

          <section className={styles.stats} aria-label="Thống kê">
            <article className={styles.statCard}>
              <span className={styles.statIcon}>▤</span>
              <div><strong>{gardens.length}</strong><span>Tác phẩm</span></div>
            </article>
            <article className={styles.statCard}>
              <span className={styles.statIcon}>▧</span>
              <div><strong>{totalPhotos}</strong><span>Ảnh đã lưu</span></div>
            </article>
            <article className={styles.statCard}>
              <span className={styles.statIcon}>✧</span>
              <div><strong>{totalChapters}</strong><span>Chương truyện</span></div>
            </article>
            <article className={styles.statCard}>
              <span className={styles.statIcon}>◷</span>
              <div><strong>{pendingApprovalCount}</strong><span>Chờ Admin duyệt</span></div>
            </article>
          </section>

          {error && <p className={styles.errorBanner} role="alert">{error}</p>}
          {notice && <p className={styles.noticeBanner} role="status">{notice}</p>}

          <section className={styles.workspace} id="garden-list">
            <div className={styles.gardenPanel}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.panelEyebrow}>STORY COLLECTION</p>
                  <h2>Các tác phẩm</h2>
                  <p>Chọn tác phẩm anh muốn quản lý.</p>
                </div>
                <span className={styles.countPill}>{gardens.length} tác phẩm</span>
              </div>

              <label className={styles.searchBox}>
                <span>⌕</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm tác phẩm..."
                  aria-label="Tìm tác phẩm"
                />
              </label>

              {gardensLoading ? (
                <div className={styles.panelEmpty}>Đang tải danh sách tác phẩm...</div>
              ) : filteredGardens.length === 0 ? (
                <div className={styles.panelEmpty}>Không tìm thấy tác phẩm phù hợp.</div>
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
                        onClick={() => setSelectedGardenId(garden.id)}
                      >
                        <span className={styles.gardenThumb}>
                          {isTestGarden ? "▤" : "▤"}
                          <i>{String(index + 1).padStart(2, "0")}</i>
                        </span>
                        <span className={styles.gardenInfo}>
                          <strong>{garden.name}</strong>
                          <small>{garden.ownerId === FAIRYTALE_GARDEN_ADMIN_USER_ID ? "Tác phẩm của Admin" : "Tác phẩm khách"} · {garden.approvalStatus === "pending" ? "Chờ duyệt" : garden.approvalStatus === "approved" ? "Đã duyệt" : garden.approvalStatus === "rejected" ? "Cần chỉnh sửa" : "Bản nháp"}</small>
                          <span>{garden.photoCount} ảnh <b>·</b> {garden.chapterCount} chương</span>
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
                      <p className={styles.panelEyebrow}>PHOTO LIBRARY</p>
                      <h2>{selectedGarden.name}</h2>
                      <p>{selectedGarden.introduction || "Khoảnh khắc của tác phẩm này."}</p>
                    </div>
                    <span className={styles.albumCount}>{photos.length} / {MAX_PHOTOS} ảnh</span>
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
                    <strong>{uploading ? "Đang đưa ảnh vào tác phẩm..." : "Thêm kỷ niệm vào tác phẩm"}</strong>
                    <p>Kéo ảnh thả vào đây hoặc chọn trực tiếp từ máy tính.</p>
                    <label className={styles.uploadButton}>
                      Chọn ảnh từ máy
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                        multiple
                        onChange={handleFileChange}
                        disabled={uploading || photos.length >= MAX_PHOTOS}
                      />
                    </label>
                    <small>JPG · PNG · WEBP · GIF · AVIF · tối đa 10 MB/ảnh</small>
                  </div>

                  <div className={styles.photoToolbar}>
                    <div>
                      <h3>Ảnh trong tác phẩm</h3>
                      <p>Chỉ những ảnh thuộc tác phẩm đang chọn được hiển thị ở đây.</p>
                    </div>
                    <span>{photos.length} tệp</span>
                  </div>

                  {photosLoading ? (
                    <div className={styles.photoEmpty}>Đang mở kho ảnh...</div>
                  ) : photos.length === 0 ? (
                    <div className={styles.photoEmpty}>
                      <span>▤</span>
                      <strong>Kho ảnh còn trống</strong>
                      <p>Thêm bức ảnh đầu tiên để lưu giữ kỷ niệm ở tác phẩm này.</p>
                    </div>
                  ) : (
                    <div className={styles.photoGrid}>
                      {photos.map((photo) => (
                        <figure className={styles.photoCard} key={photo.path}>
                          <button
                            type="button"
                            className={styles.photoOpenButton}
                            onClick={() => setActivePhotoIndex(photos.findIndex((item) => item.path === photo.path))}
                            aria-label="Phóng to ảnh trong kho"
                            title="Bấm để xem ảnh lớn"
                          >
                            <Image src={photo.url} alt={"Ảnh trong " + selectedGarden.name} width={960} height={720} sizes="(max-width: 600px) 50vw, 25vw" unoptimized loading="lazy" />
                            <span aria-hidden="true">⌕</span>
                          </button>
                          <figcaption>
                            <span>{photo.name.replace(/^[0-9a-f-]{36}-/i, "")}</span>
                            <button
                              type="button"
                              onClick={() => void deletePhoto(photo)}
                              aria-label="Xoá ảnh"
                              title="Xoá ảnh"
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
                  <strong>Chọn một tác phẩm</strong>
                  <p>Kho ảnh riêng sẽ mở ở đây.</p>
                </div>
              )}
            </section>
          </section>

          <footer className={styles.footer}>
            <span>▤ Little Story World</span>
            <span>Quản lý riêng tư · Mỗi tác phẩm một album</span>
          </footer>
        </div>
      </div>
      <PhotoLightbox
        images={photos.map((photo) => ({ url: photo.url, alt: photo.name }))}
        activeIndex={activePhotoIndex}
        onClose={() => setActivePhotoIndex(null)}
        onChange={setActivePhotoIndex}
      />
    </main>
  );
}
