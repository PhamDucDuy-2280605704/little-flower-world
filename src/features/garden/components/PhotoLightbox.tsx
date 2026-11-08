"use client";

import { useEffect } from "react";
import styles from "./PhotoLightbox.module.css";

export type LightboxImage = {
  url: string;
  alt: string;
};

type Props = {
  images: LightboxImage[];
  activeIndex: number | null;
  onClose: () => void;
  onChange: (index: number) => void;
};

export default function PhotoLightbox({ images, activeIndex, onClose, onChange }: Props) {
  const activeImage = activeIndex !== null && activeIndex >= 0 && activeIndex < images.length
    ? images[activeIndex]
    : null;
  const isOpen = activeImage !== null;

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") onChange(((activeIndex ?? 0) + 1) % images.length);
      if (event.key === "ArrowLeft") onChange(((activeIndex ?? 0) - 1 + images.length) % images.length);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeIndex, images.length, isOpen, onChange, onClose]);

  if (!isOpen || !activeImage) return null;

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className={styles.dialog} role="dialog" aria-modal="true" aria-label="Xem ảnh phóng to">
        <button className={styles.close} type="button" onClick={onClose} aria-label="Đóng ảnh" title="Đóng (Esc)">×</button>
        {images.length > 1 && (
          <>
            <button className={styles.previous} type="button" onClick={() => onChange(((activeIndex ?? 0) - 1 + images.length) % images.length)} aria-label="Ảnh trước">‹</button>
            <button className={styles.next} type="button" onClick={() => onChange(((activeIndex ?? 0) + 1) % images.length)} aria-label="Ảnh tiếp theo">›</button>
          </>
        )}
        <img className={styles.image} src={activeImage.url} alt={activeImage.alt} />
        <div className={styles.caption}>
          <span>{activeImage.alt}</span>
          <span>{(activeIndex ?? 0) + 1} / {images.length}</span>
        </div>
      </section>
    </div>
  );
}
