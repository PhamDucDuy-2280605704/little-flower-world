"use client";

import { useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import Flower from "@/features/flowers/components/Flower";
import PhotoLightbox, { type LightboxImage } from "./PhotoLightbox";
import type { GardenItem } from "@/types/garden";
import type { StoryChapter } from "@/types/story";
import styles from "../styles/GardenJournal.module.css";

export type GardenJournalPhoto = {
  path: string;
  url: string;
  alt: string;
};

type Props = {
  name: string;
  introduction: string;
  coverUrl?: string | null;
  photos?: GardenJournalPhoto[];
  items: GardenItem[];
  chapters: StoryChapter[];
  readIds: string[];
  onOpenChapter: (chapterId: string) => void;
  onOpenLetter?: () => void;
  letterReady?: boolean;
  progressText?: string;
  returnHref?: string;
  returnLabel?: string;
  actionHref?: string;
  actionLabel?: string;
  children?: ReactNode;
};

export default function GardenJournal({
  name,
  introduction,
  coverUrl,
  photos = [],
  items,
  chapters,
  readIds,
  onOpenChapter,
  onOpenLetter,
  letterReady = false,
  progressText,
  returnHref = "/",
  returnLabel = "Little Flower World",
  actionHref = "#the-path",
  actionLabel = "JOIN THE JOURNEY",
  children,
}: Props) {
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const primaryPhoto = coverUrl
    ? { url: coverUrl, alt: "Ảnh bìa " + name }
    : photos[0] ?? null;
  const secondaryPhotos = coverUrl
    ? photos.filter((photo) => photo.url !== coverUrl)
    : photos.slice(1);
  const lightboxImages = useMemo<LightboxImage[]>(() => [
    ...(primaryPhoto ? [primaryPhoto] : []),
    ...secondaryPhotos.map((photo) => ({ url: photo.url, alt: photo.alt })),
  ], [primaryPhoto, secondaryPhotos]);
  const firstChapter = chapters[0] ?? null;
  const firstParagraph = firstChapter?.paragraphs[0] ?? introduction;
  const quote = firstChapter?.paragraphs.length
    ? firstChapter.paragraphs[firstChapter.paragraphs.length - 1]
    : introduction;
  const progress = chapters.length > 0
    ? Math.round((readIds.length / chapters.length) * 100)
    : 0;
  const fallbackFlowers = items.slice(0, 7);

  function openImage(index: number) {
    if (lightboxImages.length > 0) setActivePhotoIndex(index);
  }

  return (
    <main className={styles.page}>
      <header className={styles.siteHeader}>
        <Link className={styles.brand} href={returnHref}>
          <span className={styles.brandMark}>✿</span>
          <span>LITTLE FLOWER WORLD</span>
        </Link>
        <nav aria-label="Điều hướng nhật ký khu vườn">
          <a href="#our-story">Our Story</a>
          <a href="#the-path">The Path</a>
          <a href="#in-bloom">In Bloom</a>
        </nav>
        <a className={styles.joinButton} href={actionHref}>{actionLabel}</a>
      </header>

      <section className={styles.masthead} id="our-story">
        <p className={styles.overline}><span /> WHAT GROWS HERE <span /></p>
        <h1>A Garden Journal</h1>
        <p className={styles.mastheadNote}>{name}</p>
      </section>

      <section className={styles.feature}>
        <div className={styles.featureVisual}>
          {primaryPhoto ? (
            <button
              type="button"
              className={styles.coverButton}
              onClick={() => openImage(0)}
              aria-label="Mở ảnh khu vườn ở kích thước lớn"
            >
              <Image
                src={primaryPhoto.url}
                alt={primaryPhoto.alt}
                width={1200}
                height={1500}
                sizes="(max-width: 760px) 92vw, 42vw"
                unoptimized
                priority
              />
              <span className={styles.imageExpand} aria-hidden="true">↗</span>
            </button>
          ) : (
            <div className={styles.botanicalCover} aria-label="Minh họa các loài hoa trong khu vườn">
              <span className={styles.coverSun} />
              <span className={styles.coverGardenName}>{name}</span>
              {fallbackFlowers.map((item, index) => (
                <span
                  key={item.id}
                  className={styles.fallbackFlower}
                  style={{
                    left: (12 + ((index * 29) % 78)) + "%",
                    bottom: (12 + ((index * 17) % 44)) + "%",
                    zIndex: 2 + index,
                    transform: "translateX(-50%) scale(" + Math.max(.58, Math.min(1.12, item.size)) + ")",
                  }}
                >
                  <Flower kind={item.kind} color={item.color} size={.8} />
                </span>
              ))}
              <span className={styles.coverCaption}>A place to grow, a story to keep</span>
            </div>
          )}
          <div className={styles.imageStamp}>
            <strong>{String(chapters.length).padStart(2, "0")}</strong>
            <span>CHAPTERS IN BLOOM</span>
          </div>
          <p className={styles.visualCaption}>A little world, made with care</p>
        </div>

        <article className={styles.featureStory}>
          <p className={styles.entryLabel}>FIRST ENTRY — CHAPTER 01</p>
          <h2>{firstChapter?.title || name}</h2>
          <p className={styles.introduction}>
            {introduction || "Every garden begins with a small beginning, and every flower keeps a story."}
          </p>
          <div className={styles.storyDivider}><span>✳</span></div>
          <p className={styles.entryText}>
            {firstParagraph || "The first page is waiting to be written."}
          </p>
          {firstChapter && (
            <button
              type="button"
              className={styles.readFirst}
              onClick={() => onOpenChapter(firstChapter.id)}
            >
              READ THE FIRST ENTRY <span aria-hidden="true">↗</span>
            </button>
          )}
          {quote && (
            <blockquote className={styles.quoteCard}>
              <span className={styles.quoteFlower} aria-hidden="true">✿</span>
              <p>“{quote}”</p>
              <cite>— A NOTE FROM THIS GARDEN</cite>
            </blockquote>
          )}
        </article>
      </section>

      <section className={styles.pathSection} id="the-path">
        <div className={styles.sectionIntro}>
          <p className={styles.entryLabel}>THE PATH THROUGH THE GARDEN</p>
          <h2>Every flower holds a page.</h2>
          <p>Follow the little path and open each chapter at your own pace.</p>
        </div>
        <div className={styles.progressRow}>
          <span>JOURNEY PROGRESS</span>
          <strong>{readIds.length} / {chapters.length} READ</strong>
        </div>
        <div className={styles.progressTrack} role="progressbar" aria-label="Tiến độ đọc câu chuyện" aria-valuemin={0} aria-valuemax={chapters.length} aria-valuenow={readIds.length}>
          <span style={{ width: progress + "%" }} />
        </div>
        {progressText && <p className={styles.progressText}>{progressText}</p>}
        <div className={styles.chapterList}>
          {chapters.length > 0 ? chapters.map((chapter, index) => {
            const flower = items.find((item) => item.chapterId === chapter.id);
            const isRead = readIds.includes(chapter.id);
            const excerpt = chapter.paragraphs[0] ?? "A new page in this garden.";
            return (
              <article className={styles.chapterRow} key={chapter.id}>
                <span className={styles.chapterNumber}>{String(index + 1).padStart(2, "0")}</span>
                <span className={styles.chapterFlower} aria-hidden="true">
                  {flower
                    ? <Flower kind={flower.kind} color={flower.color} size={.42} />
                    : <span>✿</span>}
                </span>
                <div className={styles.chapterCopy}>
                  <p>ENTRY {String(index + 1).padStart(2, "0")}</p>
                  <h3>{chapter.title}</h3>
                  <span>{excerpt}</span>
                </div>
                <button type="button" onClick={() => onOpenChapter(chapter.id)}>
                  {isRead ? "READ AGAIN" : "OPEN ENTRY"} <span aria-hidden="true">↗</span>
                </button>
              </article>
            );
          }) : (
            <p className={styles.emptyStory}>The first chapter is still taking root.</p>
          )}
        </div>
        {letterReady && onOpenLetter && (
          <div className={styles.finalLetter}>
            <span>THE LAST PAGE</span>
            <h3>A letter kept for you.</h3>
            <button type="button" onClick={onOpenLetter}>OPEN THE FINAL LETTER ↗</button>
          </div>
        )}
      </section>

      {(photos.length > 0 || items.length > 0) && (
        <section className={styles.bloomSection} id="in-bloom">
          <div className={styles.bloomHeading}>
            <div>
              <p className={styles.entryLabel}>IN BLOOM</p>
              <h2>Little things worth remembering.</h2>
            </div>
            <span>{photos.length} PHOTOS · {items.length} FLOWERS</span>
          </div>
          {secondaryPhotos.length > 0 ? (
            <div className={styles.photoGrid}>
              {secondaryPhotos.map((photo, index) => (
                <button
                  type="button"
                  key={photo.path}
                  onClick={() => openImage(index + (primaryPhoto ? 1 : 0))}
                  aria-label={"Mở ảnh " + (index + 1)}
                >
                  <Image src={photo.url} alt={photo.alt} width={700} height={560} sizes="(max-width: 680px) 46vw, 24vw" unoptimized loading="lazy"/>
                  <span aria-hidden="true">↗</span>
                </button>
              ))}
            </div>
          ) : (
            <div className={styles.flowerStrip}>
              {items.slice(0, 9).map((item) => (
                <span key={item.id} title={item.title || "Flower"}>
                  <Flower kind={item.kind} color={item.color} size={.52}/>
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {children}

      <footer className={styles.footer}>
        <Link href={returnHref}>{returnLabel}</Link>
        <span>GROWN WITH CARE · LITTLE FLOWER WORLD</span>
      </footer>

      <PhotoLightbox
        images={lightboxImages}
        activeIndex={activePhotoIndex}
        onClose={() => setActivePhotoIndex(null)}
        onChange={setActivePhotoIndex}
      />
    </main>
  );
}
