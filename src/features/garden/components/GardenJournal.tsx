"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode, type TouchEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import PhotoLightbox, { type LightboxImage } from "./PhotoLightbox";
import styles from "../styles/GardenJournal.module.css";

export type GardenJournalPhoto = {
  path: string;
  url: string;
  alt: string;
};

export type JournalChapter = {
  id: string;
  title: string;
  paragraphs: string[];
};

export type StoryFormat = "message" | "letter" | "book";

type BookPage = {
  id: string;
  kind: "message" | "letter" | "chapter";
  title: string;
  paragraphs: string[];
  signature?: string;
  chapterId?: string;
};

type Props = {
  name: string;
  introduction: string;
  format?: StoryFormat;
  coverUrl?: string | null;
  coverPath?: string | null;
  photos?: GardenJournalPhoto[];
  chapters?: JournalChapter[];
  readIds?: string[];
  onOpenChapter?: (chapterId: string) => void;
  letterTitle?: string;
  letterParagraphs?: string[];
  letterSignature?: string;
  letterReady?: boolean;
  returnHref?: string;
  returnLabel?: string;
  actionHref?: string;
  actionLabel?: string;
  /** Compatibility props accepted from legacy routes but deliberately never rendered. */
  items?: unknown[];
  onOpenLetter?: () => void;
  progressText?: string;
  children?: ReactNode;
};

const STOCK_BOOK_IMAGE = "https://cdn.pixabay.com/photo/2016/03/27/19/32/book-1283865_1280.jpg";
const STOCK_BOOK_PAGE = "https://pixabay.com/photos/book-pages-chapters-open-open-book-1283865/";

export default function GardenJournal({
  name,
  introduction,
  format = "book",
  coverUrl,
  coverPath,
  photos = [],
  chapters = [],
  readIds = [],
  onOpenChapter,
  letterTitle = "Một lá thư dành riêng cho bạn",
  letterParagraphs = [],
  letterSignature = "",
  letterReady = false,
  returnHref = "/",
  returnLabel = "Little Flower World",
  actionHref = "#the-book",
  actionLabel = "MỞ CUỐN SÁCH",
  children,
}: Props) {
  const [pageIndex, setPageIndex] = useState(0);
  const [turnDirection, setTurnDirection] = useState<"next" | "prev">("next");
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const lastOpenedChapterRef = useRef<string>("");
  const reduceMotion = useReducedMotion();

  const primaryPhoto = coverUrl
    ? { url: coverUrl, alt: "Ảnh bìa " + name }
    : photos[0] ?? null;
  const secondaryPhotos = coverUrl
    ? photos.filter((photo) => photo.path !== coverPath && photo.url !== coverUrl)
    : photos.slice(1);

  const lightboxImages = useMemo<LightboxImage[]>(() => [
    ...(primaryPhoto ? [primaryPhoto] : []),
    ...secondaryPhotos.map((photo) => ({ url: photo.url, alt: photo.alt })),
  ], [primaryPhoto, secondaryPhotos]);

  const pages = useMemo<BookPage[]>(() => {
    if (format === "message") {
      return [{
        id: "main-message",
        kind: "message",
        title: name || "Một lời nhắn dành cho bạn",
        paragraphs: introduction.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean),
      }];
    }

    if (format === "letter") {
      return [{
        id: "main-letter",
        kind: "letter",
        title: letterTitle,
        paragraphs: letterParagraphs,
        signature: letterSignature,
      }];
    }

    const bookPages: BookPage[] = chapters.map((chapter) => ({
      id: chapter.id,
      chapterId: chapter.id,
      kind: "chapter",
      title: chapter.title,
      paragraphs: chapter.paragraphs,
    }));

    if (letterReady && letterParagraphs.length > 0) {
      bookPages.push({
        id: "final-letter",
        kind: "letter",
        title: letterTitle,
        paragraphs: letterParagraphs,
        signature: letterSignature,
      });
    }

    return bookPages.length > 0 ? bookPages : [{
      id: "empty-book",
      kind: "message",
      title: "Trang đầu tiên",
      paragraphs: ["Cuốn sách này đang chờ những dòng đầu tiên."],
    }];
  }, [format, name, introduction, chapters, letterReady, letterTitle, letterParagraphs, letterSignature]);

  const safePageIndex = Math.min(pageIndex, Math.max(0, pages.length - 1));
  const currentPage = pages[safePageIndex];

  useEffect(() => {
    const chapterId = currentPage?.chapterId;
    if (!chapterId || lastOpenedChapterRef.current === chapterId) return;
    lastOpenedChapterRef.current = chapterId;
    onOpenChapter?.(chapterId);
  }, [currentPage?.chapterId, onOpenChapter]);

  function goToPage(nextIndex: number) {
    const bounded = Math.max(0, Math.min(pages.length - 1, nextIndex));
    if (bounded === safePageIndex) return;
    setTurnDirection(bounded > safePageIndex ? "next" : "prev");
    setPageIndex(bounded);

  }

  function openPhoto(index: number) {
    if (lightboxImages.length > 0) setActivePhotoIndex(index);
  }

  function handleBookKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goToPage(safePageIndex + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goToPage(safePageIndex - 1);
    }
  }

  function handleTouchEnd(event: TouchEvent<HTMLElement>) {
    const start = touchStartX.current;
    const end = event.changedTouches[0]?.clientX;
    touchStartX.current = null;
    if (start === null || end === undefined) return;
    const distance = end - start;
    if (Math.abs(distance) < 52) return;
    goToPage(safePageIndex + (distance < 0 ? 1 : -1));
  }

  const currentNumber = String(safePageIndex + 1).padStart(2, "0");
  const totalNumber = String(pages.length).padStart(2, "0");
  const readPercent = chapters.length > 0 ? Math.round((readIds.length / chapters.length) * 100) : 0;
  const formatLabel = format === "message" ? "THÔNG ĐIỆP" : format === "letter" ? "BỨC THƯ" : "CUỐN SÁCH";

  return (
    <main className={styles.page}>
      <header className={styles.siteHeader}>
        <Link className={styles.brand} href={returnHref}>
          <span className={styles.brandMark}>L</span>
          <span>LITTLE FLOWER WORLD</span>
        </Link>
        <nav aria-label="Điều hướng tác phẩm">
          <a href="#the-book">Cuốn sách</a>
          <a href="#contents">Mục lục</a>
          {secondaryPhotos.length > 0 && <a href="#memories">Hình ảnh</a>}
        </nav>
        <a className={styles.headerAction} href={actionHref}>{actionLabel}</a>
      </header>

      <section className={styles.masthead}>
        <p className={styles.overline}><span /> A PERSONAL STORY, MADE WITH CARE <span /></p>
        <h1>{name}</h1>
        <p className={styles.mastheadNote}>{formatLabel} · MỘT TÁC PHẨM RIÊNG DÀNH CHO BẠN</p>
      </section>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.entryLabel}>A LITTLE SOMETHING TO KEEP</p>
          <h2>Mỗi trang là một điều muốn gửi trao.</h2>
          <p>{introduction || "Có những điều thật đẹp khi được viết thành lời và lưu lại trong một cuốn sách nhỏ."}</p>
          <a href="#the-book" className={styles.readButton}>Bắt đầu lật trang <span aria-hidden="true">↗</span></a>
          <div className={styles.heroMeta}>
            <span>{chapters.length || (format === "book" ? 0 : 1)} {format === "book" ? "CHƯƠNG" : "TRANG NỘI DUNG"}</span>
            <span>ĐỌC THEO NHỊP CỦA BẠN</span>
          </div>
        </div>
        <div className={styles.heroVisual}>
          {primaryPhoto ? (
            <button
              type="button"
              className={styles.heroPhotoButton}
              onClick={() => openPhoto(0)}
              aria-label="Phóng to ảnh bìa"
            >
              <Image
                src={primaryPhoto.url}
                alt={primaryPhoto.alt}
                width={1300}
                height={900}
                sizes="(max-width: 760px) 92vw, 44vw"
                unoptimized
                priority
              />
              <span className={styles.photoExpand} aria-hidden="true">↗</span>
            </button>
          ) : (
            <div
              className={styles.stockPhoto}
              role="img"
              aria-label="Ảnh chụp một cuốn sách đang mở dưới ánh sáng tự nhiên"
              style={{ backgroundImage: "url(" + STOCK_BOOK_IMAGE + ")" }}
            >
              <span>Ảnh minh họa · Pixabay</span>
            </div>
          )}
          <div className={styles.photoNote}>
            <span>01</span>
            <p>Words become memories when we give them a page.</p>
          </div>
        </div>
      </section>

      <section
        className={styles.bookSection}
        id="the-book"
        aria-label="Trình đọc sách"
        tabIndex={0}
        onKeyDown={handleBookKeyDown}
        onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null; }}
        onTouchEnd={handleTouchEnd}
      >
        <div className={styles.sectionHeading}>
          <p className={styles.entryLabel}>TURN THE PAGE</p>
          <h2>Hãy cùng đọc nhé.</h2>
          <p>Chọn một chương ở mục lục hoặc dùng nút lật trang để tiếp tục.</p>
        </div>

        <div className={styles.openBook}>
          <aside className={styles.leftPage} id="contents">
            <div className={styles.pageTopline}>
              <span>TABLE OF CONTENTS</span>
              <span>✳</span>
            </div>
            <p className={styles.pageEyebrow}>TRONG CUỐN SÁCH NÀY</p>
            <h3>Mục lục</h3>

            {format === "book" && chapters.length > 0 ? (
              <div className={styles.contentsList}>
                {chapters.map((chapter, index) => {
                  const pageNumber = String(index + 1).padStart(2, "0");
                  const isActive = currentPage?.chapterId === chapter.id;
                  return (
                    <button
                      type="button"
                      key={chapter.id}
                      className={isActive ? styles.contentsActive : styles.contentsButton}
                      onClick={() => goToPage(index)}
                    >
                      <span>{pageNumber}</span>
                      <strong>{chapter.title}</strong>
                      <small>{readIds.includes(chapter.id) ? "Đã đọc" : "Mở trang"}</small>
                    </button>
                  );
                })}
                {letterReady && letterParagraphs.length > 0 && (
                  <button
                    type="button"
                    className={currentPage?.id === "final-letter" ? styles.contentsActive : styles.contentsButton}
                    onClick={() => goToPage(pages.length - 1)}
                  >
                    <span>✉</span>
                    <strong>{letterTitle}</strong>
                    <small>Trang cuối</small>
                  </button>
                )}
              </div>
            ) : (
              <div className={styles.contentsIntro}>
                <span>{format === "message" ? "ONE MESSAGE" : "A LETTER FOR YOU"}</span>
                <p>{format === "message" ? "Một lời nhắn được viết riêng cho bạn." : "Một bức thư nhỏ, được giữ lại trên những trang giấy."}</p>
              </div>
            )}

            <blockquote className={styles.marginNote}>
              <span>✳</span>
              <p>{introduction || "Một điều nhỏ bé, nhưng được viết bằng tất cả sự chân thành."}</p>
            </blockquote>
            <div className={styles.pageFooter}>
              <span>{name}</span>
              <span>✦</span>
            </div>
          </aside>

          <div className={styles.bookGutter} aria-hidden="true" />

          <div className={styles.rightPage}>
            <div className={styles.pageTurnWrap}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.article
                  key={currentPage.id}
                  className={styles.readingPage}
                  initial={reduceMotion ? false : {
                    opacity: 0,
                    rotateY: turnDirection === "next" ? -15 : 15,
                    x: turnDirection === "next" ? 18 : -18,
                  }}
                  animate={{ opacity: 1, rotateY: 0, x: 0 }}
                  exit={reduceMotion ? undefined : {
                    opacity: 0,
                    rotateY: turnDirection === "next" ? 15 : -15,
                    x: turnDirection === "next" ? -18 : 18,
                  }}
                  transition={{ duration: reduceMotion ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] }}
                  style={{ transformOrigin: turnDirection === "next" ? "left center" : "right center" }}
                  aria-live="polite"
                >
                  <div className={styles.pageTopline}>
                    <span>{currentPage.kind === "chapter" ? "CHAPTER" : currentPage.kind === "letter" ? "A LETTER FOR YOU" : "A MESSAGE"}</span>
                    <span>{currentNumber}</span>
                  </div>
                  <p className={styles.pageEyebrow}>{currentPage.kind === "chapter" ? "MỘT PHẦN CỦA CÂU CHUYỆN" : "DÀNH RIÊNG CHO BẠN"}</p>
                  <h3>{currentPage.title}</h3>
                  <div className={styles.pageRule}><span>✳</span></div>
                  <div className={styles.pageParagraphs}>
                    {currentPage.paragraphs.length > 0
                      ? currentPage.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)
                      : <p>Trang này đang chờ những dòng chữ đầu tiên.</p>}
                  </div>
                  {currentPage.signature && <p className={styles.signature}>{currentPage.signature}</p>}
                  <div className={styles.pageFooter}>
                    <span>{currentPage.kind === "letter" ? "WITH LOVE" : "LITTLE FLOWER WORLD"}</span>
                    <span>{currentNumber}</span>
                  </div>
                </motion.article>
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className={styles.pageControls}>
          <button type="button" onClick={() => goToPage(safePageIndex - 1)} disabled={safePageIndex === 0}>
            <span aria-hidden="true">←</span> Trang trước
          </button>
          <div className={styles.pageProgress}>
            <strong>{currentNumber}</strong>
            <span>/</span>
            <span>{totalNumber}</span>
            <div className={styles.progressTrack}><span style={{ width: ((safePageIndex + 1) / pages.length * 100) + "%" }} /></div>
          </div>
          <button type="button" onClick={() => goToPage(safePageIndex + 1)} disabled={safePageIndex >= pages.length - 1}>
            Lật trang <span aria-hidden="true">→</span>
          </button>
        </div>
        {format === "book" && chapters.length > 0 && (
          <p className={styles.readProgress}>{readIds.length} / {chapters.length} chương đã đọc · {readPercent}% hành trình</p>
        )}
      </section>

      {secondaryPhotos.length > 0 && (
        <section className={styles.memories} id="memories">
          <div className={styles.sectionHeading}>
            <p className={styles.entryLabel}>PHOTOGRAPHS & MEMORIES</p>
            <h2>Những khoảnh khắc được giữ lại.</h2>
          </div>
          <div className={styles.photoGrid}>
            {secondaryPhotos.map((photo, index) => (
              <button
                type="button"
                key={photo.path}
                onClick={() => openPhoto(index + (primaryPhoto ? 1 : 0))}
                aria-label={"Phóng to ảnh kỷ niệm " + (index + 1)}
              >
                <Image src={photo.url} alt={photo.alt} width={720} height={560} sizes="(max-width: 680px) 46vw, 25vw" unoptimized loading="lazy" />
                <span aria-hidden="true">↗</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {children}

      <footer className={styles.footer}>
        <Link href={returnHref}>{returnLabel}</Link>
        <span>A STORY CREATED WITH CARE · LITTLE FLOWER WORLD</span>
        <a href={STOCK_BOOK_PAGE} target="_blank" rel="noreferrer">Ảnh minh họa: Pixabay ↗</a>
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
