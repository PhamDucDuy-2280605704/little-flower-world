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
  embedded?: boolean;
};

export default function FamilyLetterReader({
  name,
  introduction,
  chapters,
  photos,
  letterTitle,
  letterParagraphs,
  letterSignature,
  embedded = false,
}: Props) {
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const [brokenPhotoPaths, setBrokenPhotoPaths] = useState<Set<string>>(() => new Set());

  const oldPhoto = photos.find((photo) => photo.alt.toLowerCase().includes("ngày trước")) ?? photos[1] ?? null;
  const todayPhoto = photos.find((photo) => photo.alt.toLowerCase().includes("hôm nay")) ?? photos[0] ?? null;
  const orderedPhotos = useMemo(
    () => [oldPhoto, todayPhoto].filter((photo, index, all): photo is GardenJournalPhoto =>
      photo !== null && all.findIndex((item) => item?.path === photo.path) === index
    ),
    [oldPhoto, todayPhoto],
  );
  const lightboxImages: LightboxImage[] = orderedPhotos.map((photo) => ({ url: photo.url, alt: photo.alt }));
  const paragraphCount = chapters.reduce((total, chapter) => total + chapter.paragraphs.length, 0);

  function renderPhoto(photo: GardenJournalPhoto, caption: string) {
    const photoIndex = orderedPhotos.findIndex((item) => item.path === photo.path);
    const isBroken = brokenPhotoPaths.has(photo.path);

    return (
      <figure className={styles.memory} key={photo.path}>
        {isBroken ? (
          <div className={styles.memoryUnavailable} role="img" aria-label="Ảnh kỷ niệm hiện chưa thể hiển thị">
            <span aria-hidden="true">✧</span>
            <p>Ảnh kỷ niệm này đang chờ được cập nhật lại từ bản gốc.</p>
          </div>
        ) : (
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
              style={{ maxWidth: Math.min(photo.width ?? 720, 720) + "px" }}
              unoptimized
              loading="lazy"
              onError={() => {
                setActivePhotoIndex(null);
                setBrokenPhotoPaths((current) => {
                  const next = new Set(current);
                  next.add(photo.path);
                  return next;
                });
              }}
            />
            <span className={styles.zoomHint}>Chạm để xem ảnh lớn hơn</span>
          </button>
        )}
        <figcaption>{caption}</figcaption>
      </figure>
    );
  }

  const ReaderRoot = embedded ? "div" : "main";
  const readerClassName = embedded ? styles.page + " " + styles.embeddedPage : styles.page;

  return (
    <ReaderRoot className={readerClassName}>
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
          {chapters.length > 0 && (
            <div className={styles.readingMeta} aria-label="Thông tin nội dung">
              <span>{chapters.length} chặng ký ức</span>
              <span aria-hidden="true">·</span>
              <span>{paragraphCount} đoạn tâm tình</span>
            </div>
          )}

          <p className={styles.salutation}>Ba mẹ thương mến,</p>
          {introduction && <p className={styles.opening}>{introduction}</p>}

          {chapters.map((chapter, index) => (
            <section className={styles.chapter} key={chapter.id}>
              <div className={styles.chapterHeading}>
                <span className={styles.chapterNumber}>{String(index + 1).padStart(2, "0")}</span>
                <h2>{chapter.title}</h2>
              </div>
              <div className={styles.chapterCopy}>
                {chapter.paragraphs.map((paragraph, paragraphIndex) => (
                  <p className={paragraphIndex === 0 ? styles.chapterLead : styles.chapterText} key={paragraphIndex}>
                    {paragraph}
                  </p>
                ))}
              </div>
              {index === 0 && oldPhoto && renderPhoto(oldPhoto, "Một khung hình từ những năm tháng con còn bé.")}
              {index === chapters.length - 1 && todayPhoto && todayPhoto.path !== oldPhoto?.path && renderPhoto(todayPhoto, "Gia đình mình hôm nay — một khoảnh khắc con muốn giữ thật lâu.")}
            </section>
          ))}

          {chapters.length === 0 && oldPhoto && renderPhoto(oldPhoto, "Một kỷ niệm gia đình con luôn trân trọng.")}
          {chapters.length === 0 && todayPhoto && todayPhoto.path !== oldPhoto?.path && renderPhoto(todayPhoto, "Gia đình mình hôm nay.")}

          <section className={styles.closing}>
            <p className={styles.closingLabel}>ĐIỀU CON MUỐN NÓI</p>
            {letterParagraphs.map((paragraph, index) => <p className={styles.closingText} key={index}>{paragraph}</p>)}
            {letterSignature && <p className={styles.signature}>{letterSignature}</p>}
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
    </ReaderRoot>
  );
}
