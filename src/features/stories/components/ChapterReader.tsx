"use client";

// Khung đọc một chương (hoặc lá thư), hiện lên như một cửa sổ nổi.
// Dùng thẻ <dialog> có sẵn của trình duyệt. Nó tự lo giúp mình:
//   - bấm phím Esc để đóng
//   - giữ con trỏ bàn phím (Tab) bên trong cửa sổ
//   - trả con trỏ về nút đã bấm khi đóng

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import Flower from "@/features/flowers/components/Flower";
import type { FlowerKind } from "@/types/flower";
import styles from "../styles/ChapterReader.module.css";

type ChapterReaderProps = {
  eyebrow: string; // dòng nhỏ phía trên tiêu đề, ví dụ "Chương 1 trên 4"
  title: string;
  paragraphs: string[];
  signature?: string; // chữ ký (chỉ dùng cho lá thư)
  flower?: { kind: FlowerKind; color: string }; // hoa trang trí
  // Có "navigation" thì hiện nút chương trước/sau.
  // Handler nào không có (undefined) thì nút đó bị khóa.
  navigation?: { onPrev?: () => void; onNext?: () => void };
  onClose: () => void;
};

export default function ChapterReader({
  eyebrow,
  title,
  paragraphs,
  signature,
  flower,
  navigation,
  onClose,
}: ChapterReaderProps) {
  // useRef giữ một "tay nắm" tới thẻ <dialog> thật trong trang.
  const dialogRef = useRef<HTMLDialogElement>(null);
  const reduceMotion = useReducedMotion();

  // Mở cửa sổ ngay khi component xuất hiện.
  useEffect(() => {
    const dialog = dialogRef.current;
    // Kiểm tra "!dialog.open" để không mở hai lần (React có thể chạy effect 2 lần khi đang phát triển).
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="reader-title"
      // Sự kiện "close" chạy mỗi khi cửa sổ đóng (bấm Esc, nút Đóng...)
      onClose={onClose}
      // Bấm ra vùng tối bên ngoài thì đóng
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          event.currentTarget.close();
        }
      }}
    >
      {/* key={title}: đổi chương thì nội dung được tạo mới → hoạt hình chạy lại, thanh cuộn về đầu */}
      <motion.div
        key={title}
        className={styles.sheet}
        initial={reduceMotion ? false : { opacity: 0, y: 28, rotateY: -7, rotateX: 2, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, rotateY: 0, rotateX: 0, scale: 1 }}
        transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformPerspective: 1400 }}
      >
        <div className={styles.topBar}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <button
            type="button"
            className={styles.close}
            onClick={() => dialogRef.current?.close()}
          >
            Đóng
          </button>
        </div>

        <div className={styles.body}>
          {flower && (
            <div className={styles.flower} aria-hidden="true">
              <Flower kind={flower.kind} color={flower.color} size={0.4} />
            </div>
          )}

          <h2 id="reader-title" className={styles.title}>
            {title}
          </h2>

          {paragraphs.map((text, index) => (
            <motion.p
              key={index}
              className={styles.paragraph}
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.34, delay: reduceMotion ? 0 : Math.min(index * 0.055, 0.5) }}
            >
              {text}
            </motion.p>
          ))}

          {signature && <p className={styles.signature}>{signature}</p>}
        </div>

        {navigation && (
          <div className={styles.nav}>
            <button
              type="button"
              className={styles.navButton}
              onClick={navigation.onPrev}
              disabled={!navigation.onPrev}
            >
              Chương trước
            </button>
            <button
              type="button"
              className={styles.navButton}
              onClick={navigation.onNext}
              disabled={!navigation.onNext}
            >
              Chương sau
            </button>
          </div>
        )}
      </motion.div>
    </dialog>
  );
}
