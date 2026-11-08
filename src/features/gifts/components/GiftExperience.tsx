
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import GardenView from "@/features/garden/components/GardenView";
import FairytaleGardenView from "@/features/garden/components/FairytaleGardenView";
import FairytalePhotoGallery from "@/features/garden/components/FairytalePhotoGallery";
import {
  FAIRYTALE_GARDEN_ADMIN_USER_ID,
  FAIRYTALE_TEST_GARDEN_ID,
} from "@/features/garden/data/gardenThemes";
import { mapPersonalGarden } from "@/features/garden/data/mapPersonalGarden";
import ChapterReader from "@/features/stories/components/ChapterReader";
import type {
  PersonalGarden,
  PersonalGardenRow,
} from "@/types/personalGarden";
import GiftBox from "./GiftBox";
import styles from "../styles/GiftExperience.module.css";

type Stage = "closed" | "opening" | "garden";

type Reading =
  | { kind: "chapter"; index: number }
  | { kind: "letter" }
  | null;

type GiftExperienceForUserProps = {
  user: User;
};

const OPENING_MS = 2600;

// ======================================================
// PHẦN 1: KIỂM TRA TÀI KHOẢN ĐĂNG NHẬP
// ======================================================

export default function GiftExperience() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let active = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;

      setUser(session?.user ?? null);
      setAuthReady(true);
    });

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;

        if (error) {
          console.error("Get session error:", error);
        }

        setUser(data.session?.user ?? null);
        setAuthReady(true);
      })
      .catch((error: unknown) => {
        if (!active) return;

        console.error("Get session failed:", error);
        setUser(null);
        setAuthReady(true);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!authReady) {
    return (
      <main className={styles.page}>
        <section className={styles.card}>
          <p role="status">Đang kiểm tra tài khoản...</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className={styles.page}>
        <section className={styles.card}>
          <h1 className={styles.title}>
            Khu vườn đang chờ bạn 🌷
          </h1>

          <p className={styles.message}>
            Bạn cần đăng nhập để mở món quà này.
          </p>

          <Link href="/login" className={styles.backLink}>
            Đến trang đăng nhập
          </Link>
        </section>
      </main>
    );
  }

  return (
    <PersonalGardenExperience
      key={user.id}
      user={user}
    />
  );
}

// ======================================================
// PHẦN 2: KHU VƯỜN RIÊNG CỦA TỪNG TÀI KHOẢN
// ======================================================

function PersonalGardenExperience({
  user,
}: GiftExperienceForUserProps) {
  const [stage, setStage] = useState<Stage>("closed");
  const [reading, setReading] = useState<Reading>(null);

  const [garden, setGarden] = useState<PersonalGarden | null>(null);
  const [gardenLoading, setGardenLoading] = useState(true);
  const [gardenError, setGardenError] = useState("");

  const [readIds, setReadIds] = useState<string[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState("");

  const reduceMotion = useReducedMotion();

  const chapters = garden?.chapters ?? [];
  const totalChapters = chapters.length;

  const allRead =
    totalChapters > 0 &&
    chapters.every((chapter) => readIds.includes(chapter.id));

  // Only this specific test garden receives the separate fairy-tale renderer.
  const isFairytaleGarden = garden?.id === FAIRYTALE_TEST_GARDEN_ID;

  // ====================================================
  // TẢI KHU VƯỜN VÀ TIẾN ĐỘ CỦA NGƯỜI DÙNG
  // ====================================================

  useEffect(() => {
    let active = true;

    async function loadPersonalGarden() {
      try {
        const { data, error } = await supabase
          .from("gardens")
          .select(
            `
              id,
              name,
              introduction,
              letter_title,
              letter_paragraphs,
              letter_signature,
              garden_items (
                id,
                kind,
                color,
                x,
                depth,
                size,
                chapter_id,
                label,
                title,
                sort_order
              ),
              garden_chapters (
                chapter_id,
                sort_order,
                title,
                paragraphs
              )
            `
          )
          .eq("owner_id", user.id)
          .maybeSingle();

        if (!active) return;

        if (error) {
          console.error("Load personal garden error:", error);

          setGardenError(
            "Chưa tải được khu vườn của bạn. Hãy thử tải lại trang nhé."
          );

          setGardenLoading(false);
          return;
        }

        if (!data) {
          setGarden(null);
          setGardenLoading(false);
          return;
        }

        const personalGarden = mapPersonalGarden(
          data as unknown as PersonalGardenRow
        );

        if (!active) return;

        setGarden(personalGarden);
        setGardenLoading(false);
        setProgressLoading(true);

        try {
          const {
            data: progress,
            error: progressLoadError,
          } = await supabase
            .from("story_progress")
            .select("chapter_id")
            .eq("user_id", user.id);

          if (!active) return;

          if (progressLoadError) {
            console.error(
              "Load story progress error:",
              progressLoadError
            );

            setProgressError(
              "Chưa tải được tiến độ đọc. Hãy thử tải lại trang nhé."
            );
          } else {
            const chapterIds = new Set(
              personalGarden.chapters.map((chapter) => chapter.id)
            );

            const validIds = (progress ?? [])
              .map((row) => row.chapter_id as string)
              .filter((id) => chapterIds.has(id));

            setReadIds([...new Set(validIds)]);
          }
        } catch (error) {
          if (!active) return;

          console.error("Load story progress failed:", error);

          setProgressError(
            "Có lỗi khi tải tiến độ đọc. Hãy thử tải lại trang nhé."
          );
        }

        if (active) {
          setProgressLoading(false);
        }
      } catch (error) {
        if (!active) return;

        console.error("Load personal garden failed:", error);

        setGardenError(
          "Có lỗi khi tải khu vườn. Hãy thử tải lại trang nhé."
        );

        setGardenLoading(false);
        setProgressLoading(false);
      }
    }

    void loadPersonalGarden();

    return () => {
      active = false;
    };
  }, [user.id]);

  // ====================================================
  // HIỆU ỨNG MỞ HỘP QUÀ
  // ====================================================

  useEffect(() => {
    if (stage !== "opening") return;

    const timer = setTimeout(() => {
      setStage("garden");
    }, OPENING_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [stage]);

  function handleOpenGift() {
    if (!garden) return;

    setStage(reduceMotion ? "garden" : "opening");
  }

  // ====================================================
  // MỞ CHƯƠNG TRUYỆN VÀ LƯU TIẾN ĐỘ
  // ====================================================

  async function openChapter(index: number) {
    const chapter = chapters[index];

    if (!chapter) return;

    setReading({
      kind: "chapter",
      index,
    });

    setProgressError("");

    const { error } = await supabase
      .from("story_progress")
      .upsert(
        {
          user_id: user.id,
          chapter_id: chapter.id,
        },
        {
          onConflict: "user_id,chapter_id",
        }
      );

    if (error) {
      console.error("Save story progress error:", error);

      setProgressError(
        "Chưa lưu được chương này. Kiểm tra kết nối rồi thử lại nhé."
      );

      return;
    }

    setReadIds((current) =>
      current.includes(chapter.id)
        ? current
        : [...current, chapter.id]
    );
  }

  function openChapterById(chapterId: string) {
    const index = chapters.findIndex(
      (chapter) => chapter.id === chapterId
    );

    if (index !== -1) {
      void openChapter(index);
    }
  }

  // ====================================================
  // ĐÓNG QUÀ VÀ QUAY LẠI
  // ====================================================

  function handleReplay() {
    setReading(null);
    setStage("closed");
  }

  const currentChapter =
    reading?.kind === "chapter"
      ? chapters[reading.index]
      : null;

  // ====================================================
  // ĐANG TẢI KHU VƯỜN
  // ====================================================

  if (gardenLoading) {
    return (
      <main className={styles.page}>
        <section className={styles.card}>
          <p className={styles.message} role="status">
            Đang tìm khu vườn dành riêng cho bạn...
          </p>
        </section>
      </main>
    );
  }

  // ====================================================
  // KHÔNG TẢI ĐƯỢC HOẶC CHƯA CÓ KHU VƯỜN
  // ====================================================

  if (gardenError || !garden) {
    return (
      <main className={styles.page}>
        <section className={styles.card}>
          <h1 className={styles.title}>
            {gardenError
              ? "Khu vườn đang gặp chút trục trặc 🌷"
              : "Khu vườn chưa được gieo 🌱"}
          </h1>

          <p className={styles.message}>
            {gardenError ||
              "Món quà này chưa được thiết lập. Hãy liên hệ người đã gửi lời mời cho bạn nhé."}
          </p>

          <Link href="/" className={styles.backLink}>
            Về trang chủ
          </Link>
        </section>
      </main>
    );
  }

  // ====================================================
  // GIAO DIỆN CHÍNH CỦA KHU VƯỜN
  // ====================================================

  return (
    <main className={isFairytaleGarden && stage === "garden" ? styles.fairytalePage : styles.page}>
      <section className={isFairytaleGarden && stage === "garden" ? styles.fairytaleCard : styles.card}>
        <AnimatePresence mode="wait">
          {stage !== "garden" ? (
            <motion.div
              key="box"
              className={styles.boxScreen}
              exit={{
                opacity: 0,
                scale: 0.96,
              }}
              transition={{
                duration: 0.5,
              }}
            >
              <div>
                <h1 className={styles.title}>
                  Có một món quà dành cho bạn
                </h1>

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
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              transition={{
                duration: 0.6,
              }}
            >
              <h1 className={isFairytaleGarden ? `${styles.title} ${styles.fairytaleTitle}` : styles.title}>
                {isFairytaleGarden ? "Khu vườn cổ tích bí mật" : garden.name}
              </h1>

              <p className={isFairytaleGarden ? `${styles.message} ${styles.fairytaleMessage}` : styles.message}>
                {garden.introduction ||
                  "Bấm vào những bông hoa có nhãn chương để đọc câu chuyện bên trong."}
              </p>

              {isFairytaleGarden ? (
                <FairytaleGardenView
                  items={garden.items}
                  readIds={readIds}
                  onOpenChapter={openChapterById}
                />
              ) : (
                <GardenView
                  items={garden.items}
                  readIds={readIds}
                  onOpenChapter={openChapterById}
                />
              )}

              <FairytalePhotoGallery
                currentUserId={user.id}
                adminUserId={FAIRYTALE_GARDEN_ADMIN_USER_ID}
              />

              <p className={styles.progress} role="status">
                {progressLoading
                  ? "Đang tải tiến độ..."
                  : `Đã đọc ${readIds.length}/${totalChapters} chương`}
              </p>

              {progressError && (
                <p
                  role="alert"
                  className={styles.locked}
                >
                  {progressError}
                </p>
              )}

              {allRead ? (
                <motion.button
                  type="button"
                  className={styles.letterButton}
                  onClick={() => {
                    setReading({ kind: "letter" });
                  }}
                  initial={
                    reduceMotion
                      ? false
                      : {
                          opacity: 0,
                          scale: 0.85,
                        }
                  }
                  animate={{
                    opacity: 1,
                    scale: 1,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 160,
                    damping: 11,
                  }}
                >
                  Mở lá thư cuối
                </motion.button>
              ) : (
                <p className={styles.locked}>
                  {totalChapters === 0
                    ? "Khu vườn đang được chuẩn bị thêm câu chuyện."
                    : "Đọc hết các chương để mở lá thư cuối nhé."}
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

                <Link
                  href="/"
                  className={styles.backLink}
                >
                  Về trang chủ
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

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
            onPrev:
              reading.index > 0
                ? () => void openChapter(reading.index - 1)
                : undefined,

            onNext:
              reading.index < totalChapters - 1
                ? () => void openChapter(reading.index + 1)
                : undefined,
          }}
          onClose={() => {
            setReading(null);
          }}
        />
      )}

      {reading?.kind === "letter" && allRead && (
        <ChapterReader
          eyebrow="Lá thư cuối"
          title={garden.letter.title}
          paragraphs={garden.letter.paragraphs}
          signature={garden.letter.signature}
          onClose={() => {
            setReading(null);
          }}
        />
      )}
    </main>
  );
}
