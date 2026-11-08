"use client";

import { useEffect, useRef, type TouchEvent } from "react";
import { createPortal } from "react-dom";
import styles from "../styles/PhotoLightbox.module.css";

export type LightboxImage = { url: string; alt: string };

type Props = {
  images: LightboxImage[];
  activeIndex: number | null;
  onClose: () => void;
  onChange: (index: number) => void;
};

export default function PhotoLightbox({
  images,
  activeIndex,
  onClose,
  onChange,
}: Props) {
  const activeImage =
    activeIndex !== null && activeIndex >= 0 && activeIndex < images.length
      ? images[activeIndex]
      : null;
  const isOpen = activeIndex !== null && activeImage !== null;

  const backdropRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const touchStartXRef = useRef<number | null>(null);

  // Keep the latest values without tearing down the modal when changing images.
  const activeIndexRef = useRef(activeIndex);
  const imageCountRef = useRef(images.length);
  const onCloseRef = useRef(onClose);
  const onChangeRef = useRef(onChange);
  activeIndexRef.current = activeIndex;
  imageCountRef.current = images.length;
  onCloseRef.current = onClose;
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!isOpen) return;

    const body = document.body;
    const previousActiveElement = document.activeElement;
    const previousScrollY = window.scrollY;
    const previousBodyStyles = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    };

    // The lightbox is portalled directly into body. Make every other body
    // child inert so the page behind an aria-modal dialog cannot be interacted with.
    const restoreInert: Array<() => void> = [];
    for (const child of Array.from(body.children)) {
      if (child === backdropRef.current) continue;
      if (!(child instanceof HTMLElement)) continue;

      const wasInert = child.inert;
      child.inert = true;
      restoreInert.push(() => {
        child.inert = wasInert;
      });
    }

    // Fixed positioning also prevents touch scrolling behind the modal on mobile.
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${previousScrollY}px`;
    body.style.width = "100%";

    closeButtonRef.current?.focus({ preventScroll: true });

    const getFocusableElements = () => {
      const dialog = dialogRef.current;
      if (!dialog) return [];

      return Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.getAttribute("aria-hidden") !== "true");
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key === "ArrowRight" && imageCountRef.current > 1) {
        event.preventDefault();
        const index = activeIndexRef.current ?? 0;
        onChangeRef.current((index + 1) % imageCountRef.current);
        return;
      }

      if (event.key === "ArrowLeft" && imageCountRef.current > 1) {
        event.preventDefault();
        const index = activeIndexRef.current ?? 0;
        onChangeRef.current(
          (index - 1 + imageCountRef.current) % imageCountRef.current,
        );
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;

      if (
        event.shiftKey &&
        (current === first || !dialogRef.current?.contains(current))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (current === last || !dialogRef.current?.contains(current))
      ) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      body.style.overflow = previousBodyStyles.overflow;
      body.style.position = previousBodyStyles.position;
      body.style.top = previousBodyStyles.top;
      body.style.width = previousBodyStyles.width;
      restoreInert.forEach((restore) => restore());

      if (previousActiveElement instanceof HTMLElement) {
        previousActiveElement.focus({ preventScroll: true });
      }
      window.scrollTo(0, previousScrollY);
    };
  }, [isOpen]);

  function handleTouchStart(event: TouchEvent<HTMLElement>) {
    touchStartXRef.current = event.changedTouches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: TouchEvent<HTMLElement>) {
    const startX = touchStartXRef.current;
    const endX = event.changedTouches[0]?.clientX;
    touchStartXRef.current = null;

    if (startX === null || endX === undefined || images.length < 2) return;

    const delta = startX - endX;
    if (Math.abs(delta) < 56) return;

    const index = activeIndex ?? 0;
    onChange(
      delta > 0
        ? (index + 1) % images.length
        : (index - 1 + images.length) % images.length,
    );
  }

  if (!activeImage || typeof document === "undefined") return null;
  const currentIndex = activeIndex ?? 0;

  return createPortal(
    <div
      ref={backdropRef}
      className={styles.backdrop}
      role="presentation"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Xem ảnh phóng to"
        tabIndex={-1}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <button
          ref={closeButtonRef}
          className={styles.close}
          type="button"
          onClick={onClose}
          aria-label="Đóng ảnh"
          title="Đóng (Esc)"
        >
          ×
        </button>

        {images.length > 1 && (
          <>
            <button
              className={styles.previous}
              type="button"
              onClick={() =>
                onChange((currentIndex - 1 + images.length) % images.length)
              }
              aria-label="Ảnh trước"
            >
              ‹
            </button>
            <button
              className={styles.next}
              type="button"
              onClick={() => onChange((currentIndex + 1) % images.length)}
              aria-label="Ảnh tiếp theo"
            >
              ›
            </button>
          </>
        )}

        <img
          className={styles.image}
          src={activeImage.url}
          alt={activeImage.alt}
          draggable={false}
        />

        <div className={styles.caption}>
          <span>{activeImage.alt}</span>
          <span aria-live="polite">
            {currentIndex + 1} / {images.length}
          </span>
        </div>
      </section>
    </div>,
    document.body,
  );
}
