"use client";

import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { supabase } from "@/lib/supabase";
import styles from "../styles/FairytalePhotoGallery.module.css";

const BUCKET = "garden-photos";
// Preserve one upload created under the old test-account folder.
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

type Photo = { name: string; path: string; url: string; createdAt: string };

type Props = {
  currentUserId: string;
  adminUserId: string;
};

export default function FairytalePhotoGallery({
  currentUserId,
  adminUserId,
}: Props) {
  const isAdmin = currentUserId === adminUserId;
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Visitors read the shared admin album and the one preserved legacy upload.
  const loadPhotos = useCallback(async () => {
    setLoading(true);
    setError("");

    const folders = [adminUserId, LEGACY_TEST_FOLDER];
    const listings = await Promise.all(
      folders.map(async (folder) => {
        const { data, error: listError } = await supabase.storage
          .from(BUCKET)
          .list(folder, {
            limit: MAX_PHOTOS,
            sortBy: { column: "created_at", order: "desc" },
          });
        return { folder, data, error: listError };
      })
    );

    const failedListing = listings.find((listing) => listing.error);
    if (failedListing?.error) {
      console.error("Load shared garden photos error:", failedListing.error);
      if (isAdmin) setError("Chưa tải được album ảnh. Anh thử tải lại trang nhé.");
      setLoading(false);
      return;
    }

    const files = listings.flatMap(({ folder, data }) =>
      (data ?? [])
        .filter(
          (file) =>
            file.name &&
            file.id &&
            ALLOWED_TYPES.has(file.metadata?.mimetype ?? "")
        )
        .map((file) => ({ folder, file }))
    );

    const signedPhotos = await Promise.all(
      files.map(async ({ folder, file }) => {
        const path = folder + "/" + file.name;
        const { data: signed, error: signedError } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(path, 60 * 60);

        if (signedError || !signed?.signedUrl) return null;
        return {
          name: file.name,
          path,
          url: signed.signedUrl,
          createdAt: file.created_at ?? "",
        };
      })
    );

    const visiblePhotos = signedPhotos
      .filter((photo): photo is Photo => photo !== null)
      .sort(
        (a, b) =>
          (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)
      )
      .slice(0, MAX_PHOTOS);

    setPhotos(visiblePhotos);
    setLoading(false);
  }, [adminUserId, isAdmin]);

  useEffect(() => {
    void loadPhotos();
  }, [loadPhotos]);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (!isAdmin || files.length === 0) return;

    setError("");
    setNotice("");

    if (photos.length + files.length > MAX_PHOTOS) {
      setError("Album hiện hỗ trợ tối đa " + MAX_PHOTOS + " ảnh. Anh hãy chọn ít ảnh hơn nhé.");
      return;
    }

    const invalid = files.find(
      (file) => !ALLOWED_TYPES.has(file.type) || file.size > MAX_FILE_SIZE
    );

    if (invalid) {
      setError("Ảnh cần ở định dạng JPG, PNG, WEBP, GIF hoặc AVIF và không quá 10 MB mỗi ảnh.");
      return;
    }

    setUploading(true);

    for (const file of files) {
      const safeName = file.name
        .normalize("NFKD")
        .replace(/[^a-zA-Z0-9._-]/g, "-")
        .replace(/-+/g, "-")
        .slice(-80);
      const path =
        adminUserId + "/" + crypto.randomUUID() + "-" + (safeName || "photo");

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload shared garden photo error:", uploadError);
        setError('Không tải được ảnh "' + file.name + '". Anh thử lại nhé.');
        setUploading(false);
        await loadPhotos();
        return;
      }
    }

    setUploading(false);
    setNotice(
      files.length === 1
        ? "Ảnh đã được thêm vào album 🌷"
        : "Đã thêm " + files.length + " ảnh vào album 🌷"
    );
    await loadPhotos();
  }

  async function handleDelete(photo: Photo) {
    if (!isAdmin) return;
    if (!window.confirm("Anh muốn xoá ảnh này khỏi album chứ?")) return;

    setError("");
    setNotice("");

    const { error: deleteError } = await supabase.storage
      .from(BUCKET)
      .remove([photo.path]);

    if (deleteError) {
      console.error("Delete shared garden photo error:", deleteError);
      setError("Chưa xoá được ảnh. Anh thử lại nhé.");
      return;
    }

    setPhotos((current) => current.filter((item) => item.path !== photo.path));
    setNotice("Đã xoá ảnh khỏi album.");
  }

  // Visitors only see the pictures. No admin copy, controls, empty state, or alerts.
  if (!isAdmin && (loading || photos.length === 0)) return null;
  if (!isAdmin && error) return null;

  return (
    <section
      className={isAdmin ? styles.gallery : styles.gallery + " " + styles.viewer}
      aria-label={isAdmin ? "Quản lý album ảnh" : "Ảnh kỷ niệm"}
    >
      {isAdmin && (
        <>
          <div className={styles.heading}>
            <div>
              <p className={styles.kicker}>GÓC KỶ NIỆM</p>
              <h2 className={styles.title}>Album ảnh của anh</h2>
              <p className={styles.description}>
                Những khoảnh khắc anh muốn giữ lại trong khu vườn này.
              </p>
            </div>

            <label className={styles.uploadButton}>
              <input
                className={styles.fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                multiple
                onChange={handleUpload}
                disabled={uploading || photos.length >= MAX_PHOTOS}
              />
              {uploading ? "Đang tải ảnh..." : "＋ Thêm ảnh"}
            </label>
          </div>

          <p className={styles.helper}>
            JPG, PNG, WEBP, GIF hoặc AVIF · tối đa 10 MB mỗi ảnh · tối đa {MAX_PHOTOS} ảnh
          </p>

          {error && <p className={styles.error} role="alert">{error}</p>}
          {notice && <p className={styles.notice} role="status">{notice}</p>}
        </>
      )}

      {loading ? (
        isAdmin ? <p className={styles.empty} role="status">Đang mở album ảnh...</p> : null
      ) : photos.length === 0 ? (
        isAdmin ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon} aria-hidden="true">✿</span>
            <p>Album vẫn đang chờ những bức ảnh đầu tiên.</p>
            <p className={styles.emptyHint}>Anh có thể chọn ảnh ngay từ máy tính của mình.</p>
          </div>
        ) : null
      ) : (
        <div className={styles.grid}>
          {photos.map((photo) => (
            <figure className={styles.photo} key={photo.path}>
              <img src={photo.url} alt="Ảnh kỷ niệm trong khu vườn" loading="lazy" />
              {isAdmin && (
                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={() => void handleDelete(photo)}
                  aria-label="Xoá ảnh này"
                  title="Xoá ảnh"
                >
                  ×
                </button>
              )}
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
