"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import PhotoLightbox, { type LightboxImage } from "./PhotoLightbox";
import type { GardenJournalPhoto, JournalChapter } from "./GardenJournal";
import styles from "../styles/FamilyLetterReader.module.css";

type Props = {
  name: string;
  introduction: string;
  chapters: JournalChapter[];
  photos: GardenJournalPhoto[];
  letterTitle: string;
  letterParagraphs: string[];
  letterSignature: string;
};

export default function FamilyLetterReader({
  name,
  introduction,
  chapters,
  photos,
  letterTitle,
  letterParagraphs,
  letterSignature,
}: Props) {
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);

  const oldPhoto = photos.find((photo) => photo.alt.toLowerCase().includes("ngày trước")) ?? photos[1] ?? null;
  const todayPhoto = photos.find((photo) => photo.alt.toLowerCase().includes("hôm nay")) ?? photos[0] ?? null;
  const orderedPhotos = useMemo(
    () => [oldPhoto, todayPhoto].filter((photo): photo is GardenJournalPhoto => photo !== null),
    [oldPhoto, todayPhoto],
  );
  const lightboxImages: LightboxImage[] = orderedPhotos.map((photo) => ({ url: photo.url, alt: photo.alt }));

  function renderPhoto(photo: GardenJournalPhoto, caption: string) {
    const photoIndex = orderedPhotos.findIndex((item) => item.path === photo.path);
    return (
      <figure className={styles.memory} key={photo.path}>
        <button
          type="button"
          className={styles.memoryButton}
          onClick={() => setActivePhotoIndex(photoIndex)}
          aria-label={"Phóng to ảnh: " + photo.alt}
        >
          <Image
            src={photo.url}
            alt={photo.alt}
            width={photo.width ?? 960}
            height={photo.height ?? 720}
            sizes="(max-width: 760px) 92vw, 760px"
            unoptimized
            loading="lazy"
          />
          <span className={styles.zoomHint}>Chạm để xem ảnh lớn hơn</span>
        </button>
        <figcaption>{caption}</figcaption>
      </figure>
    );
  }

  return (
    <main className={styles.page}>
      <article className={styles.letter}>
        <header className={styles.letterHeader}>
          <p className={styles.kicker}>MỘT TÂM THƯ GỬI BA MẸ</p>
          <span className={styles.flourish} aria-hidden="true">✦</span>
          <h1>{name}</h1>
          <p className={styles.subtitle}>{letterTitle}</p>
          <span className={styles.rule} aria-hidden="true" />
          <p className={styles.headerNote}>Được viết bằng ký ức, lòng biết ơn và tình yêu của con.</p>
        </header>

        <div className={styles.letterBody}>
          <p className={styles.salutation}>Ba mẹ thương mến,</p>
          <p className={styles.opening}>{introduction}</p>

          {chapters.map((chapter, index) => (
            <section className={styles.chapter} key={chapter.id}>
              <h2><span>{String(index + 1).padStart(2, "0")}</span>{chapter.title}</h2>
              {chapter.paragraphs.map((paragraph, paragraphIndex) => (
                <p key={paragraphIndex}>{paragraph}</p>
              ))}
              {index === 0 && oldPhoto && renderPhoto(oldPhoto, "Một khung hình từ những năm tháng con còn bé.")}
              {index === 3 && todayPhoto && renderPhoto(todayPhoto, "Gia đình mình hôm nay — một khoảnh khắc con muốn giữ thật lâu.")}
            </section>
          ))}

          {chapters.length === 0 && oldPhoto && renderPhoto(oldPhoto, "Một kỷ niệm gia đình con luôn trân trọng.")}
          {chapters.length === 0 && todayPhoto && renderPhoto(todayPhoto, "Gia đình mình hôm nay.")}

          <section className={styles.closing}>
            <p className={styles.closingLabel}>ĐIỀU CON MUỐN NÓI</p>
            {letterParagraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            <p className={styles.signature}>{letterSignature}</p>
          </section>
        </div>

        <footer className={styles.letterFooter}>
          <span>Thương ba mẹ thật nhiều</span>
          <span aria-hidden="true">✧</span>
        </footer>
      </article>

      <PhotoLightbox
        images={lightboxImages}
        activeIndex={activePhotoIndex}
        onClose={() => setActivePhotoIndex(null)}
        onChange={setActivePhotoIndex}
      />
    </main>
  );
}
