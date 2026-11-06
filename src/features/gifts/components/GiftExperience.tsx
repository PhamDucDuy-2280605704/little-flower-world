"use client";

// Hành trình mở quà: hộp quà → mở ra (ánh sáng + cánh hoa) → khu vườn (đồi, gió, ngày đêm)
// → bấm từng bông hoa để đọc từng chương → mở lá thư cuối.
// Dùng biến "stage" để nhớ đang ở màn hình nào, biến "reading" để nhớ đang đọc gì.

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import GardenView from "@/features/garden/components/GardenView";
import { sampleGarden } from "@/features/garden/data/sampleGarden";
import ChapterReader from "@/features/stories/components/ChapterReader";
import {
  sampleChapters,
  sampleLetter,
} from "@/features/stories/data/sampleStory";
import GiftBox from "./GiftBox";
import styles from "../styles/GiftExperience.module.css";

// Ba màn hình của hành trình
type Stage = "closed" | "opening" | "garden";

// Đang đọc gì: một chương (kèm số thứ tự), lá thư, hoặc không đọc gì (null).
type Reading = { kind: "chapter"; index: number } | { kind: "letter" } | null;

// Thời gian (mili-giây) từ lúc bấm đến lúc chuyển sang khu vườn
const OPENING_MS = 2600;

export default function GiftExperience() {
  const [stage, setStage] = useState<Stage>("closed");
  const [reading, setReading] = useState<Reading>(null);
  // Danh sách mã (id) các chương đã đọc
  const [readIds, setReadIds] = useState<string[]>([]);
  const reduceMotion = useReducedMotion();

  const totalChapters = sampleChapters.length;
  // Đã đọc hết mọi chương thì mới mở được lá thư cuối
  const allRead = readIds.length === totalChapters;

  // Khi chuyển sang "opening", hẹn giờ để tự chuyển sang "garden".
  // Hàm return bên trong dùng để dọn dẹp bộ hẹn giờ nếu người dùng rời trang.
  useEffect(() => {
    if (stage !== "opening") return;

    const timer = setTimeout(() => setStage("garden"), OPENING_MS);
    return () => clearTimeout(timer);
  }, [stage]);

  function handleOpenGift() {
    // Người dùng chọn giảm chuyển động → bỏ qua hoạt hình, vào thẳng khu vườn.
    setStage(reduceMotion ? "garden" : "opening");
  }

  // Mở một chương và ghi nhận là "đã đọc".
  function openChapter(index: number) {
    const id = sampleChapters[index].id;
    // Chỉ thêm vào danh sách nếu chưa có (tránh trùng)
    setReadIds((current) => (current.includes(id) ? current : [...current, id]));
    setReading({ kind: "chapter", index });
  }

  // Mở chương theo mã (id). Khu vườn chỉ biết mã chương, nên cần bước đổi mã → số thứ tự.
  function openChapterById(chapterId: string) {
    const index = sampleChapters.findIndex((c) => c.id === chapterId);
    if (index !== -1) {
      openChapter(index);
    }
  }

  // Đóng quà lại: quay về đầu và xóa tiến độ đọc (tiện khi đang học/thử).
  function handleReplay() {
    setReading(null);
    setReadIds([]);
    setStage("closed");
  }

  // Chuẩn bị nội dung cho cửa sổ đọc (nếu đang đọc chương)
  const currentChapter =
    reading?.kind === "chapter" ? sampleChapters[reading.index] : null;

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        {/* AnimatePresence cho phép màn hình cũ "biến mất mượt" trước khi màn mới hiện */}
        <AnimatePresence mode="wait">
          {stage !== "garden" ? (
            <motion.div
              key="box"
              className={styles.boxScreen}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.5 }}
            >
              <div>
                <h1 className={styles.title}>Có một món quà dành cho bạn</h1>
                <p className={styles.hint} role="status">
                  {stage === "opening"
                    ? "Đang mở quà..."
                    : "Bấm vào hộp quà để mở nhé."}
                </p>
              </div>

              <button
                type="button"
                className={styles.openButton}
                onClick={handleOpenGift}
                disabled={stage === "opening"}
                aria-label="Mở hộp quà"
              >
                <GiftBox opened={stage === "opening"} />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="garden"
              className={styles.garden}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className={styles.title}>Khu vườn của bạn</h1>
              <p className={styles.message}>
                Bấm vào những bông hoa có nhãn chương để đọc câu chuyện bên trong. Thử đổi ngày đêm, đổi gió, hoặc thổi bồ công anh nhé.
              </p>

              {/* Khu vườn: hoa có nhãn "Chương" bấm được, bồ công anh thổi được */}
              <GardenView
                items={sampleGarden}
                readIds={readIds}
                onOpenChapter={openChapterById}
              />

              {/* Tiến độ đọc + nút mở lá thư cuối */}
              <p className={styles.progress} role="status">
                Đã đọc {readIds.length}/{totalChapters} chương
              </p>

              {allRead ? (
                <motion.button
                  type="button"
                  className={styles.letterButton}
                  onClick={() => setReading({ kind: "letter" })}
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 160, damping: 11 }}
                >
                  Mở lá thư cuối
                </motion.button>
              ) : (
                <p className={styles.locked}>
                  Đọc hết các chương để mở lá thư cuối nhé.
                </p>
              )}

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.replay}
                  onClick={handleReplay}
                >
                  Đóng quà lại
                </button>
                <Link href="/" className={styles.backLink}>
                  Về trang chủ
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Cửa sổ đọc chương */}
      {reading?.kind === "chapter" && currentChapter && (
        <ChapterReader
          eyebrow={`Chương ${reading.index + 1} trên ${totalChapters}`}
          title={currentChapter.title}
          paragraphs={currentChapter.paragraphs}
          flower={{
            kind: currentChapter.flowerKind,
            color: currentChapter.flowerColor,
          }}
          navigation={{
            // Chương đầu thì không có "trước", chương cuối thì không có "sau"
            onPrev:
              reading.index > 0 ? () => openChapter(reading.index - 1) : undefined,
            onNext:
              reading.index < totalChapters - 1
                ? () => openChapter(reading.index + 1)
                : undefined,
          }}
          onClose={() => setReading(null)}
        />
      )}

      {/* Cửa sổ đọc lá thư cuối */}
      {reading?.kind === "letter" && (
        <ChapterReader
          eyebrow="Lá thư cuối"
          title={sampleLetter.title}
          paragraphs={sampleLetter.paragraphs}
          signature={sampleLetter.signature}
          onClose={() => setReading(null)}
        />
      )}
    </main>
  );
}
