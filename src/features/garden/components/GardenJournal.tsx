"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode, type TouchEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import PhotoLightbox, { type LightboxImage } from "./PhotoLightbox";
import styles from "../styles/GardenJournal.module.css";
import { useLanguage } from "@/features/i18n/LanguageProvider";

export type GardenJournalPhoto = {
  path: string;
  url: string;
  alt: string;
  width?: number;
  height?: number;
};

export type JournalChapter = {
  id: string;
  title: string;
  paragraphs: string[];
};

export type StoryFormat = "message" | "letter" | "book";
export type StoryTheme = "meadow" | "sunset" | "starlight";
export type StoryPaper = "ivory" | "linen" | "rose";
export type StoryEffect = "page-turn" | "soft-glow" | "sparkles" | "none";
export type StoryStickerId = "flower" | "heart" | "butterfly" | "star" | "ribbon" | "moon" | "leaf" | "sparkle" | "mushroom" | "cat";

export type StoryDecorations = {
  theme: StoryTheme;
  paper: StoryPaper;
  effect: StoryEffect;
  stickers: StoryStickerId[];
};

export const STORY_STICKERS: Array<{ id: StoryStickerId; emoji: string; label: string; labelEn: string }> = [
  { id: "flower", emoji: "🌼", label: "Hoa nhỏ", labelEn: "Flower" },
  { id: "heart", emoji: "💗", label: "Trái tim", labelEn: "Heart" },
  { id: "butterfly", emoji: "🦋", label: "Bướm", labelEn: "Butterfly" },
  { id: "star", emoji: "⭐", label: "Ngôi sao", labelEn: "Star" },
  { id: "ribbon", emoji: "🎀", label: "Nơ xinh", labelEn: "Ribbon" },
  { id: "moon", emoji: "🌙", label: "Mặt trăng", labelEn: "Moon" },
  { id: "leaf", emoji: "🍃", label: "Lá xanh", labelEn: "Leaf" },
  { id: "sparkle", emoji: "✨", label: "Lấp lánh", labelEn: "Sparkle" },
  { id: "mushroom", emoji: "🍄", label: "Nấm nhỏ", labelEn: "Mushroom" },
  { id: "cat", emoji: "🐈", label: "Mèo", labelEn: "Cat" },
];

export const DEFAULT_STORY_DECORATIONS: StoryDecorations = {
  theme: "meadow",
  paper: "ivory",
  effect: "page-turn",
  stickers: [],
};

export function normalizeStoryDecorations(value: unknown): StoryDecorations {
  if (!value || typeof value !== "object") return DEFAULT_STORY_DECORATIONS;
  const source = value as Record<string, unknown>;
  const themes: StoryTheme[] = ["meadow", "sunset", "starlight"];
  const papers: StoryPaper[] = ["ivory", "linen", "rose"];
  const effects: StoryEffect[] = ["page-turn", "soft-glow", "sparkles", "none"];
  const stickerIds = new Set(STORY_STICKERS.map((sticker) => sticker.id));
  return {
    theme: themes.includes(source.theme as StoryTheme) ? source.theme as StoryTheme : "meadow",
    paper: papers.includes(source.paper as StoryPaper) ? source.paper as StoryPaper : "ivory",
    effect: effects.includes(source.effect as StoryEffect) ? source.effect as StoryEffect : "page-turn",
    stickers: Array.isArray(source.stickers)
      ? source.stickers.filter((item): item is StoryStickerId => typeof item === "string" && stickerIds.has(item as StoryStickerId)).slice(0, 10)
      : [],
  };
}

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
  decorations?: StoryDecorations;
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
  standalone?: boolean;
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
  decorations: decorationsInput,
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
  returnLabel = "Little Story World",
  standalone = false,
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
  const { t } = useLanguage();
  const decorations = normalizeStoryDecorations(decorationsInput);
  const themeClass = decorations.theme === "sunset" ? styles.themeSunset
    : decorations.theme === "starlight" ? styles.themeStarlight : styles.themeMeadow;
  const paperClass = decorations.paper === "linen" ? styles.paperLinen
    : decorations.paper === "rose" ? styles.paperRose : styles.paperIvory;
  const effectClass = decorations.effect === "soft-glow" ? styles.effectGlow
    : decorations.effect === "sparkles" ? styles.effectSparkles : decorations.effect === "none" ? styles.effectNone : styles.effectPageTurn;
  const stickerPositions = [styles.stickerTopLeft, styles.stickerTopRight, styles.stickerBottomLeft, styles.stickerBottomRight, styles.stickerMidLeft, styles.stickerMidRight];

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
  const formatLabel = format === "message" ? t("THÔNG ĐIỆP", "MESSAGE") : format === "letter" ? t("BỨC THƯ", "LETTER") : t("CUỐN SÁCH", "BOOK");

  return (
    <main className={styles.page}>
      {!standalone && (
        <header className={styles.siteHeader}>
          <Link className={styles.brand} href={returnHref}>
            <span className={styles.brandMark}>L</span>
            <span>LITTLE STORY WORLD</span>
          </Link>
          <nav aria-label={t("Điều hướng tác phẩm", "Story navigation")}>
            <a href="#the-book">{t("Cuốn sách", "Book")}</a>
            <a href="#contents">{t("Mục lục", "Contents")}</a>
            {secondaryPhotos.length > 0 && <a href="#memories">{t("Hình ảnh", "Photos")}</a>}
          </nav>
          <a className={styles.headerAction} href={actionHref}>{actionLabel === "MỞ CUỐN SÁCH" || actionLabel === "MỞ TÁC PHẨM" ? t(actionLabel, "OPEN STORY") : actionLabel === "ĐỂ LẠI LỜI NHẮN" ? t(actionLabel, "LEAVE A NOTE") : actionLabel}</a>
        </header>
      )}

      <section className={styles.masthead}>
        <p className={styles.overline}><span /> {t("MỘT CÂU CHUYỆN ĐƯỢC TẠO BẰNG SỰ CHÂN THÀNH", "A PERSONAL STORY, MADE WITH CARE")} <span /></p>
        <h1>{name}</h1>
        <p className={styles.mastheadNote}>{formatLabel} · {t("MỘT TÁC PHẨM RIÊNG DÀNH CHO BẠN", "A PERSONAL STORY FOR YOU")}</p>
      </section>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.entryLabel}>{t("MỘT ĐIỀU NHỎ ĐỂ LƯU GIỮ", "A LITTLE SOMETHING TO KEEP")}</p>
          <h2>{t("Mỗi trang là một điều muốn gửi trao.", "Every page holds something worth sharing.")}</h2>
          <p>{introduction || t("Có những điều thật đẹp khi được viết thành lời và lưu lại trong một cuốn sách nhỏ.", "Some things are beautiful when written down and kept in a little book.")}</p>
          <a href="#the-book" className={styles.readButton}>{t("Bắt đầu lật trang", "Start reading")} <span aria-hidden="true">↗</span></a>
          <div className={styles.heroMeta}>
            <span>{chapters.length || (format === "book" ? 0 : 1)} {format === "book" ? t("CHƯƠNG", "CHAPTERS") : t("TRANG NỘI DUNG", "PAGES")}</span>
            <span>{t("ĐỌC THEO NHỊP CỦA BẠN", "READ AT YOUR OWN PACE")}</span>
          </div>
        </div>
        <div className={styles.heroVisual}>
          {primaryPhoto ? (
            <button
              type="button"
              className={styles.heroPhotoButton}
              onClick={() => openPhoto(0)}
              aria-label={t("Phóng to ảnh bìa", "Enlarge cover photo")}
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
              aria-label={t("Ảnh chụp một cuốn sách đang mở dưới ánh sáng tự nhiên", "An open book in natural light")}
              style={{ backgroundImage: "url(" + STOCK_BOOK_IMAGE + ")" }}
            >
              <span>{t("Ảnh minh họa · Pixabay", "Illustration · Pixabay")}</span>
            </div>
          )}
          <div className={styles.photoNote}>
            <span>01</span>
            <p>{t("Câu chữ trở thành ký ức khi ta dành cho chúng một trang giấy.", "Words become memories when we give them a page.")}</p>
          </div>
        </div>
      </section>

      <section
        className={styles.bookSection}
        id="the-book"
        aria-label={t("Trình đọc sách", "Book reader")}
        tabIndex={0}
        onKeyDown={handleBookKeyDown}
        onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null; }}
        onTouchEnd={handleTouchEnd}
      >
        <div className={styles.sectionHeading}>
          <p className={styles.entryLabel}>{t("LẬT SANG TRANG MỚI", "TURN THE PAGE")}</p>
          <h2>{t("Hãy cùng đọc nhé.", "Let's read together.")}</h2>
          <p>{t("Chọn một chương ở mục lục hoặc dùng nút lật trang để tiếp tục.", "Choose a chapter from the contents or turn the page to continue.")}</p>
        </div>

        <div className={[
          styles.openBook, themeClass, paperClass, effectClass,
        ].join(" ")}>
          {decorations.stickers.length > 0 && <div className={styles.stickerLayer} aria-hidden="true">
            {decorations.stickers.map((stickerId, index) => {
              const sticker = STORY_STICKERS.find((item) => item.id === stickerId);
              return sticker ? <span key={stickerId} className={[styles.sticker, stickerPositions[index % stickerPositions.length]].join(" ")}>{sticker.emoji}</span> : null;
            })}
          </div>}
          <aside className={styles.leftPage} id="contents">
            <div className={styles.pageTopline}>
              <span>{t("MỤC LỤC", "TABLE OF CONTENTS")}</span>
              <span>✳</span>
            </div>
            <p className={styles.pageEyebrow}>{t("TRONG CUỐN SÁCH NÀY", "IN THIS BOOK")}</p>
            <h3>{t("Mục lục", "Contents")}</h3>

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
                      <small>{readIds.includes(chapter.id) ? t("Đã đọc", "Read") : t("Mở trang", "Open page")}</small>
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
                    <small>{t("Trang cuối", "Final page")}</small>
                  </button>
                )}
              </div>
            ) : (
              <div className={styles.contentsIntro}>
                <span>{format === "message" ? "ONE MESSAGE" : t("A LETTER FOR YOU", "A LETTER FOR YOU")}</span>
                <p>{format === "message" ? t("Một lời nhắn được viết riêng cho bạn.", "A message written just for you.") : t("Một bức thư nhỏ, được giữ lại trên những trang giấy.", "A small letter kept between these pages.")}</p>
              </div>
            )}

            <blockquote className={styles.marginNote}>
              <span>✳</span>
              <p>{introduction || t("Một điều nhỏ bé, nhưng được viết bằng tất cả sự chân thành.", "A small thought, written with all sincerity.")}</p>
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
                  className={[styles.readingPage, effectClass].join(" ")}
                  initial={reduceMotion || decorations.effect === "none" ? false : {
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
                  transition={{ duration: reduceMotion || decorations.effect === "none" ? 0 : decorations.effect === "soft-glow" ? 0.58 : 0.42, ease: [0.22, 1, 0.36, 1] }}
                  style={{ transformOrigin: turnDirection === "next" ? "left center" : "right center" }}
                  aria-live="polite"
                >
                  <div className={styles.pageTopline}>
                    <span>{currentPage.kind === "chapter" ? t("CHAPTER", "CHAPTER") : currentPage.kind === "letter" ? t("A LETTER FOR YOU", "A LETTER FOR YOU") : t("A MESSAGE", "A MESSAGE")}</span>
                    <span>{currentNumber}</span>
                  </div>
                  <p className={styles.pageEyebrow}>{currentPage.kind === "chapter" ? t("MỘT PHẦN CỦA CÂU CHUYỆN", "PART OF THE STORY") : t("DÀNH RIÊNG CHO BẠN", "MADE FOR YOU")}</p>
                  <h3>{currentPage.title}</h3>
                  <div className={styles.pageRule}><span>✳</span></div>
                  <div className={styles.pageParagraphs}>
                    {currentPage.paragraphs.length > 0
                      ? currentPage.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)
                      : <p>{t("Trang này đang chờ những dòng chữ đầu tiên.", "This page is waiting for its first words.")}</p>}
                  </div>
                  {currentPage.signature && <p className={styles.signature}>{currentPage.signature}</p>}
                  <div className={styles.pageFooter}>
                    <span>{currentPage.kind === "letter" ? t("WITH LOVE", "WITH LOVE") : t("LITTLE STORY WORLD", "LITTLE STORY WORLD")}</span>
                    <span>{currentNumber}</span>
                  </div>
                </motion.article>
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className={styles.pageControls}>
          <button type="button" onClick={() => goToPage(safePageIndex - 1)} disabled={safePageIndex === 0}>
            <span aria-hidden="true">←</span> {t("Trang trước", "Previous page")}
          </button>
          <div className={styles.pageProgress}>
            <strong>{currentNumber}</strong>
            <span>/</span>
            <span>{totalNumber}</span>
            <div className={styles.progressTrack}><span style={{ width: ((safePageIndex + 1) / pages.length * 100) + "%" }} /></div>
          </div>
          <button type="button" onClick={() => goToPage(safePageIndex + 1)} disabled={safePageIndex >= pages.length - 1}>
            {t("Lật trang", "Turn page")} <span aria-hidden="true">→</span>
          </button>
        </div>
        {format === "book" && chapters.length > 0 && (
          <p className={styles.readProgress}>{readIds.length} / {chapters.length} {t("chương đã đọc", "chapters read")} · {readPercent}% {t("hành trình", "complete")}</p>
        )}
      </section>

      {secondaryPhotos.length > 0 && (
        <section className={styles.memories} id="memories">
          <div className={styles.sectionHeading}>
            <p className={styles.entryLabel}>{t("PHOTOGRAPHS & MEMORIES", "PHOTOGRAPHS & MEMORIES")}</p>
            <h2>{t("Những khoảnh khắc được giữ lại.", "Moments worth keeping.")}</h2>
          </div>
          <div className={styles.photoGrid}>
            {secondaryPhotos.map((photo, index) => (
              <button
                type="button"
                key={photo.path}
                onClick={() => openPhoto(index + (primaryPhoto ? 1 : 0))}
                aria-label={t("Phóng to ảnh kỷ niệm", "Enlarge memory photo") + " " + (index + 1)}
              >
                <Image src={photo.url} alt={photo.alt} width={720} height={560} sizes="(max-width: 680px) 46vw, 25vw" unoptimized loading="lazy" />
                <span aria-hidden="true">↗</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {children}

      {!standalone && (
        <footer className={styles.footer}>
          <Link href={returnHref}>{returnLabel === "Quay về cổng khách" ? t("Quay về cổng khách", "Back to reader portal") : returnLabel === "Quay lại trung tâm Admin" ? t("Quay lại trung tâm Admin", "Back to Admin center") : returnLabel}</Link>
          <span>{t("MỘT CÂU CHUYỆN ĐƯỢC TẠO BẰNG SỰ CHÂN THÀNH", "A STORY CREATED WITH CARE")} · LITTLE STORY WORLD</span>
          <a href={STOCK_BOOK_PAGE} target="_blank" rel="noreferrer">{t("Ảnh minh họa: Pixabay ↗", "Image: Pixabay ↗")}</a>
        </footer>
      )}

      <PhotoLightbox
        images={lightboxImages}
        activeIndex={activePhotoIndex}
        onClose={() => setActivePhotoIndex(null)}
        onChange={setActivePhotoIndex}
      />
    </main>
  );
}
