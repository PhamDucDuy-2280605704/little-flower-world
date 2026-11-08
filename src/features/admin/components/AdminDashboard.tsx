"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
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
  garden_items: Array<{ id: string }> | null;
  garden_chapters: Array<{ chapter_id: string }> | null;
};

type Garden = {
  id: string;
  ownerId: string;
  name: string;
  introduction: string;
  createdAt: string;
  flowerCount: number;
  chapterCount: number;
  photoCount: number;
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

function formatDate(value: string): string {
  if (!value) return "Vừa cập nhật";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function AdminDashboard() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [authState, setAuthState] = useState<"checking" | "admin" | "denied">("checking");
  const [userEmail, setUserEmail] = useState("");
  const [gardens, setGardens] = useState<Garden[]>([]);
  const [selectedGardenId, setSelectedGardenId] = useState("");
  const [gardensLoading, setGardensLoading] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
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

    const { data, error: gardenError } = await supabase
      .from("gardens")
      .select("id, owner_id, name, introduction, created_at, garden_items(id), garden_chapters(chapter_id)")
      .order("created_at", { ascending: false });

    if (gardenError) {
      console.error("Load all gardens failed:", gardenError);
      setError("Chưa tải được danh sách khu vườn. Anh thử tải lại trang nhé.");
      setGardensLoading(false);
      return;
    }

    const rows = (data ?? []) as unknown as GardenRow[];
    const results = await Promise.all(rows.map(async (row) => {
      const folderResults = await Promise.all(photoFolders(row.id).map(async (folder) => {
        const { data: files, error: listError } = await supabase.storage
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
        flowerCount: row.garden_items?.length ?? 0,
        chapterCount: row.garden_chapters?.length ?? 0,
        photoCount: folderResults.reduce((sum, count) => sum + count, 0),
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
    if (authState === "admin") void loadGardens();
  }, [authState, loadGardens]);

  const selectedGarden = gardens.find((garden) => garden.id === selectedGardenId) ?? null;

  const loadAlbum = useCallback(async (garden: Garden) => {
    setPhotosLoading(true);
    setError("");
    setNotice("");

    const listings = await Promise.all(photoFolders(garden.id).map(async (folder) => {
      const { data, error: listError } = await supabase.storage
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
      setError("Không tải được kho ảnh của khu vườn này.");
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
      const { data, error: signedError } = await supabase.storage
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
    if (authState === "admin" && selectedGarden) void loadAlbum(selectedGarden);
  }, [authState, selectedGarden?.id, loadAlbum]);

  const filteredGardens = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("vi");
    if (!query) return gardens;
    return gardens.filter((garden) =>
      (garden.name + " " + garden.introduction).toLocaleLowerCase("vi").includes(query)
    );
  }, [gardens, search]);

  const totalPhotos = gardens.reduce((sum, garden) => sum + garden.photoCount, 0);
  const totalFlowers = gardens.reduce((sum, garden) => sum + garden.flowerCount, 0);

  async function uploadFiles(files: File[]) {
    if (!selectedGarden || files.length === 0 || uploading) return;

    setError("");
    setNotice("");

    if (photos.length + files.length > MAX_PHOTOS) {
      setError("Mỗi khu vườn lưu tối đa " + MAX_PHOTOS + " ảnh nhé anh.");
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
      const { error: uploadError } = await supabase.storage
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
    setNotice(files.length === 1 ? "Đã thêm ảnh vào kho của khu vườn 🌷" : "Đã thêm " + files.length + " ảnh vào kho 🌷");
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
    if (!window.confirm("Xoá ảnh này khỏi kho của khu vườn?")) return;

    setError("");
    setNotice("");
    const { error: deleteError } = await supabase.storage
      .from(BUCKET)
      .remove([photo.path]);

    if (deleteError) {
      console.error("Delete garden photo failed:", deleteError);
      setError("Chưa xoá được ảnh. Anh thử lại nhé.");
      return;
    }

    setPhotos((current) => current.filter((item) => item.path !== photo.path));
    setNotice("Đã xoá ảnh khỏi kho của khu vườn.");
    await loadGardens();
  }

  async function handleLogout() {
    const { error: logoutError } = await supabase.auth.signOut();
    if (logoutError) {
      setError("Đăng xuất chưa thành công. Anh thử lại nhé.");
      return;
    }
    window.location.assign("/");
  }

  if (authState === "checking") {
    return (
      <main className={styles.loadingPage}>
        <div className={styles.loadingMark}>✿</div>
        <p>Đang mở không gian quản lý...</p>
      </main>
    );
  }

  if (authState !== "admin") {
    return (
      <main className={styles.deniedPage}>
        <div className={styles.deniedCard}>
          <span className={styles.deniedMark}>✿</span>
          <p className={styles.eyebrow}>LITTLE FLOWER WORLD</p>
          <h1>Khu vực dành riêng cho Admin</h1>
          <p>Anh cần đăng nhập bằng tài khoản quản trị để mở trung tâm này.</p>
          <Link href="/login" className={styles.primaryLink}>Đăng nhập Admin</Link>
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
            <span className={styles.brandMark}>✿</span>
            <span>
              <strong>Little Flower</strong>
              <small>WORLD STUDIO</small>
            </span>
          </Link>

          <div className={styles.sidebarSection}>
            <p className={styles.sidebarLabel}>KHÔNG GIAN LÀM VIỆC</p>
            <a href="#overview" className={styles.sideLinkActive}>⌂ <span>Tổng quan</span></a>
            <a href="#garden-list" className={styles.sideLink}>❀ <span>Các khu vườn</span></a>
            <a href="#photo-library" className={styles.sideLink}>▧ <span>Kho ảnh riêng</span></a>
          </div>

          <div className={styles.sidebarBottom}>
            <div className={styles.avatar}>D</div>
            <div className={styles.accountCopy}>
              <strong>Garden Admin</strong>
              <span>{userEmail}</span>
            </div>
            <span className={styles.adminDot} title="Admin đang hoạt động" />
          </div>
        </aside>

        <div className={styles.main}>
          <header className={styles.topbar}>
            <div>
              <p className={styles.eyebrow}>ADMIN STUDIO <span>·</span> LITTLE FLOWER WORLD</p>
              <h1>Trung tâm quản lý</h1>
              <p className={styles.subtitle}>Mỗi khu vườn có một album riêng, mọi kỷ niệm đều ở đúng nơi.</p>
            </div>
            <div className={styles.topActions}>
              <Link href="/gift" className={styles.secondaryLink}>Xem khu vườn</Link>
              <button type="button" className={styles.logoutButton} onClick={() => void handleLogout()}>Đăng xuất</button>
            </div>
          </header>

          <section className={styles.hero} id="overview">
            <div className={styles.heroCopy}>
              <span className={styles.heroTag}>✦ YOUR PRIVATE WORKSPACE</span>
              <h2>Chăm chút từng khu vườn,<br /><em>lưu giữ từng khoảnh khắc.</em></h2>
              <p>Chọn một khu vườn bên dưới để xem và quản lý kho ảnh riêng của nơi ấy.</p>
            </div>
            <div className={styles.heroArt} aria-hidden="true">
              <span className={styles.heroMoon} />
              <span className={styles.heroStem} />
              <span className={styles.heroPetalOne} />
              <span className={styles.heroPetalTwo} />
              <span className={styles.heroLeafOne} />
              <span className={styles.heroLeafTwo} />
              <span className={styles.heroSparkle}>✧</span>
            </div>
          </section>

          <section className={styles.stats} aria-label="Thống kê">
            <article className={styles.statCard}>
              <span className={styles.statIcon}>✿</span>
              <div><strong>{gardens.length}</strong><span>Khu vườn</span></div>
            </article>
            <article className={styles.statCard}>
              <span className={styles.statIcon}>▧</span>
              <div><strong>{totalPhotos}</strong><span>Ảnh đã lưu</span></div>
            </article>
            <article className={styles.statCard}>
              <span className={styles.statIcon}>✧</span>
              <div><strong>{totalFlowers}</strong><span>Bông hoa</span></div>
            </article>
          </section>

          {error && <p className={styles.errorBanner} role="alert">{error}</p>}
          {notice && <p className={styles.noticeBanner} role="status">{notice}</p>}

          <section className={styles.workspace} id="garden-list">
            <div className={styles.gardenPanel}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.panelEyebrow}>GARDEN COLLECTION</p>
                  <h2>Các khu vườn</h2>
                  <p>Chọn khu vườn anh muốn quản lý.</p>
                </div>
                <span className={styles.countPill}>{gardens.length} vườn</span>
              </div>

              <label className={styles.searchBox}>
                <span>⌕</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm khu vườn..."
                  aria-label="Tìm khu vườn"
                />
              </label>

              {gardensLoading ? (
                <div className={styles.panelEmpty}>Đang tải danh sách vườn...</div>
              ) : filteredGardens.length === 0 ? (
                <div className={styles.panelEmpty}>Không tìm thấy khu vườn phù hợp.</div>
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
                          {isTestGarden ? "✧" : "✿"}
                          <i>{String(index + 1).padStart(2, "0")}</i>
                        </span>
                        <span className={styles.gardenInfo}>
                          <strong>{garden.name}</strong>
                          <small>{garden.ownerId === FAIRYTALE_GARDEN_ADMIN_USER_ID ? "Vườn của Admin" : "Vườn khách"}</small>
                          <span>{garden.photoCount} ảnh <b>·</b> {garden.flowerCount} hoa</span>
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
                      <p>{selectedGarden.introduction || "Khoảnh khắc của khu vườn này."}</p>
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
                    <strong>{uploading ? "Đang đưa ảnh vào khu vườn..." : "Thêm kỷ niệm vào khu vườn"}</strong>
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
                      <h3>Ảnh trong khu vườn</h3>
                      <p>Chỉ những ảnh thuộc khu vườn đang chọn được hiển thị ở đây.</p>
                    </div>
                    <span>{photos.length} tệp</span>
                  </div>

                  {photosLoading ? (
                    <div className={styles.photoEmpty}>Đang mở kho ảnh...</div>
                  ) : photos.length === 0 ? (
                    <div className={styles.photoEmpty}>
                      <span>✿</span>
                      <strong>Kho ảnh còn trống</strong>
                      <p>Thêm bức ảnh đầu tiên để lưu giữ kỷ niệm ở khu vườn này.</p>
                    </div>
                  ) : (
                    <div className={styles.photoGrid}>
                      {photos.map((photo) => (
                        <figure className={styles.photoCard} key={photo.path}>
                          <img src={photo.url} alt={"Ảnh trong " + selectedGarden.name} loading="lazy" />
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
                  <span>✿</span>
                  <strong>Chọn một khu vườn</strong>
                  <p>Kho ảnh riêng sẽ mở ở đây.</p>
                </div>
              )}
            </section>
          </section>

          <footer className={styles.footer}>
            <span>✿ Little Flower World</span>
            <span>Quản lý riêng tư · Mỗi vườn một album</span>
          </footer>
        </div>
      </div>
    </main>
  );
}
