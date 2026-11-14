"use client";

import { useEffect, useState } from "react";
import styles from "./first-visit-intro.module.css";

const STORAGE_KEY = "little-story-world:intro-completed:v1";

export default function FirstVisitIntro() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(window.localStorage.getItem(STORAGE_KEY) !== "1");
    } catch {
      setVisible(true);
    }
  }, []);

  function startUsing() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } finally {
      setVisible(false);
    }
  }

  if (!visible) return null;

  return (
    <div className={styles.backdrop}>
      <section
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="story-intro-title"
        aria-describedby="story-intro-description"
      >
        <span className={styles.flower} aria-hidden="true">✿</span>
        <p className={styles.kicker}>A LITTLE WORLD MADE OF WORDS</p>
        <h2 id="story-intro-title">Mỗi câu chuyện đều xứng đáng được nâng niu</h2>
        <p className={styles.lead} id="story-intro-description">
          Little Story World là góc nhỏ để anh viết nên những thông điệp, bức thư và cuốn sách
          nhiều chương dành riêng cho một người đặc biệt.
        </p>
        <div className={styles.steps}>
          <article><span>✎</span><div><strong>Viết theo cách của anh</strong><p>Chọn thông điệp, thư hoặc sách nhiều chương; thêm ảnh và dấu ấn riêng.</p></div></article>
          <article><span>♡</span><div><strong>Gửi gắm điều muốn nói</strong><p>Lưu bản nháp riêng tư và gửi Admin kiểm duyệt trước khi xuất bản.</p></div></article>
          <article><span>❀</span><div><strong>Trao câu chuyện đến người nhận</strong><p>Chia sẻ liên kết để người thương mở ra, đọc và lưu lại kỷ niệm.</p></div></article>
        </div>
        <button className={styles.startButton} type="button" onClick={startUsing}>
          Bắt đầu sử dụng <span aria-hidden="true">↗</span>
        </button>
        <p className={styles.note}>Lời chào đầu tiên chỉ xuất hiện một lần trên trình duyệt này.</p>
      </section>
    </div>
  );
}
