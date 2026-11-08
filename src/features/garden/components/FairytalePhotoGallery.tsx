"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import PhotoLightbox from "./PhotoLightbox";
import { supabase } from "@/lib/supabase";
import styles from "../styles/FairytalePhotoGallery.module.css";

const BUCKET = "garden-photos";
const MAX_PHOTOS = 40;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

type Photo = {
  path: string;
  url: string;
  createdAt: string;
};

type Props = {
  gardenId: string;
  legacyFolderId?: string;
};

// Read-only album view used on the visitor's own garden page.
// Admin uploads and deletes are kept inside /admin.
export default function FairytalePhotoGallery({
  gardenId,
  legacyFolderId,
}: Props) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);

  const loadPhotos = useCallback(async () => {
    const folders = Array.from(new Set(
      [gardenId, legacyFolderId].filter((folder): folder is string => Boolean(folder))
    ));

    const listings = await Promise.all(
      folders.map(async (folder) => {
        const { data, error } = await supabase.storage
          .from(BUCKET)
          .list(folder, {
            limit: MAX_PHOTOS,
            sortBy: { column: "created_at", order: "desc" },
          });
        return { folder, data, error };
      })
    );

    if (listings.some((listing) => listing.error)) {
      console.error("Load garden album failed:", listings.find((listing) => listing.error)?.error);
      setPhotos([]);
      return;
    }

    const records = listings.flatMap(({ folder, data }) =>
      (data ?? [])
        .filter(
          (file) =>
            file.name &&
            file.id &&
            ALLOWED_TYPES.has(file.metadata?.mimetype ?? "")
        )
        .map((file) => ({
          path: folder + "/" + file.name,
          createdAt: file.created_at ?? "",
        }))
    );

    const signed = await Promise.all(
      records.map(async (record) => {
        const { data, error } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(record.path, 60 * 60);
        if (error || !data?.signedUrl) return null;
        return { ...record, url: data.signedUrl };
      })
    );

    setPhotos(
      signed
        .filter((photo): photo is Photo => photo !== null)
        .sort(
          (a, b) =>
            (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)
        )
        .slice(0, MAX_PHOTOS)
    );
  }, [gardenId, legacyFolderId]);

  useEffect(() => {
    // Intentional async Supabase Storage read; state updates follow the requests.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPhotos();
  }, [loadPhotos]);

  if (photos.length === 0) return null;

  return (
    <section className={styles.gallery + " " + styles.viewer} aria-label="Album ảnh của khu vườn">
      <div className={styles.grid}>
        {photos.map((photo) => (
          <figure className={styles.photo} key={photo.path}>
            <button
              type="button"
              className={styles.photoOpenButton}
              onClick={() => setActivePhotoIndex(photos.findIndex((item) => item.path === photo.path))}
              aria-label="Phóng to ảnh trong khu vườn"
              title="Bấm để xem ảnh lớn"
            >
              <Image src={photo.url} alt="Khoảnh khắc trong khu vườn" width={1200} height={900} sizes="(max-width: 600px) 50vw, 25vw" unoptimized loading="lazy" />
              <span className={styles.zoomHint} aria-hidden="true">⌕</span>
            </button>
          </figure>
        ))}
      </div>
      <PhotoLightbox
        images={photos.map((photo) => ({ url: photo.url, alt: "Khoảnh khắc trong khu vườn" }))}
        activeIndex={activePhotoIndex}
        onClose={() => setActivePhotoIndex(null)}
        onChange={setActivePhotoIndex}
      />
    </section>
  );
}
