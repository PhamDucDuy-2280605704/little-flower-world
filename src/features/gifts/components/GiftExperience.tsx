"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import GardenView from "@/features/garden/components/GardenView";
import { mapPersonalGarden } from "@/features/garden/data/mapPersonalGarden";
import ChapterReader from "@/features/stories/components/ChapterReader";
import type { PersonalGardenRow, PersonalGarden } from "@/types/personalGarden";
import GiftBox from "./GiftBox";
import styles from "../styles/GiftExperience.module.css";

type Stage = "closed" | "opening" | "garden";
type Reading =
  | { kind: "chapter"; index: number }
  | { kind: "letter" }
  | null;

const OPENING_MS = 2600;

export default function GiftExperience() {
  const [stage, setStage] = useState<Stage>("closed");
  const [reading, setReading] = useState<Reading>(null);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [garden, setGarden] = useState<PersonalGarden | null>(null);
  const [gardenLoading, setGardenLoading] = useState(true);
  const [gardenError, setGardenError] = useState("");
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState("");

  const reduceMotion = useReducedMotion();
  const chapters = garden?.chapters ?? [];
  const totalChapters = chapters.length;
  const allRead =
    totalChapters > 0 &&
    chapters.every((chapter) => readIds.includes(chapter.id));

  // Lấy phiên đăng nhập và theo dõi khi đăng nhập / đăng xuất.
  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;

      if (error) {
        setGardenError("Không thể kiểm tra phiên đăng nhập. Hãy tải lại trang.");
      }

      setUser(data.session?.user ?? null);
      setAuthReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setAuthReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // Tải khu vườn, câu chuyện và tiến độ chỉ thuộc tài khoản hiện tại.
  useEffect(() => {
    if (!authReady) return;

    let active = true;

    setGarden(null);
    setReadIds([]);
    setGardenError("");
    setProgressError("");

    if (!user) {
      setGardenLoading(false);
      setProgressLoading(false);
      return;
    }

    async function loadPersonalGarden() {
      setGardenLoading(true);
      setProgressLoading(false);

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
            "Chưa tải được khu vườn của bạn. Hãy thử tải lại trang."
          );
          setGardenLoading(false);
          return;
        }

        if (!data) {
          setGarden(null);
          setReadIds([]);
          setGardenLoading(false);
          return;
        }

        const personalGarden = mapPersonalGarden(
          data as unknown as PersonalGardenRow
        );

        setGarden(personalGarden);
        setGardenLoading(false);
        setProgressLoading(true);

        const { data: progress, error: progressLoadError } = await supabase
          .from("story_progress")
          .select("chapter_id")
          .eq("user_id", user.id);

        if (!active) return;

        if (progressLoadError) {
          console.error("Load story progress error:", progressLoadError);
          setProgressError(
            "Chưa tải được tiến độ đọc. Hãy thử tải lại trang."
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

        setProgressLoading(false);
      } catch (error) {
        if (!active) return;
        console.error("Load personal garden failed:", error);
        setGardenError(
          "Có lỗi khi tải khu vườn. Hãy thử tải lại trang."
        );
        setGardenLoading(false);
        setProgressLoading(false);
      }
    }

    void loadPersonalGarden();

    return () => {
      active = false;
    };
  }, [user, authReady]);

  // Chuyển từ hiệu ứng mở quà sang khu vườn.
  useEffect(() => {
    if (stage !== "opening") return;

    const timer = setTimeout(() => setStage("garden"), OPENING_MS);
    return () => clearTimeout(timer);
  }, [stage]);

  function handleOpenGift() {
    if (!user || !garden) return;
    setStage(reduceMotion ? "garden" : "opening");
  }

  // Ghi nhận chương đã đọc lên Supabase.
  async function openChapter(index: number) {
    const chapter = chapters[index];
    if (!chapter || !user) return;

    setReading({ kind: "chapter", index });
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
    const index = chapters.findIndex((chapter) => chapter.id === chapterId);

    if (index !== -1) {
      void openChapter(index);
    }
  }

  // Quay lại đầu hành trình nhưng giữ nguyên tiến độ đã lưu.
  function handleReplay() {
    setReading(null);
    setStage("closed");
  }

  const currentChapter =
    reading?.kind === "chapter" ? chapters[reading.index] : null;

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
          <h1 className={styles.title}>Khu vườn đang chờ bạn 🌷</h1>
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

  if (gardenError || !garden) {
    return (
      <main className={styles.page}>
        <section className={styles.card}>
          <h1 className={styles.title}>
            {gardenError ? "Khu vườn đang gặp chút trục trặc 🌷" : "Khu vườn chưa được gieo 🌱"}
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

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <AnimatePresence mode="wait">
          {stage !== "garden" ? (
            <motion.div
              key="box"
              className={styles.boxScreen}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.5 }}
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className={styles.title}>{garden.name}</h1>

              <p className={styles.message}>
                {garden.introduction ||
                  "Bấm vào những bông hoa có nhãn chương để đọc câu chuyện bên trong."}
              </p>

              <GardenView
                items={garden.items}
                readIds={readIds}
                onOpenChapter={openChapterById}
              />

              <p className={styles.progress} role="status">
                {progressLoading
                  ? "Đang tải tiến độ..."
                  : `Đã đọc ${readIds.length}/${totalChapters} chương`}
              </p>

              {progressError && (
                <p role="alert" className={styles.locked}>
                  {progressError}
                </p>
              )}

              {allRead ? (
                <motion.button
                  type="button"
                  className={styles.letterButton}
                  onClick={() => setReading({ kind: "letter" })}
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
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

                <Link href="/" className={styles.backLink}>
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
          onClose={() => setReading(null)}
        />
      )}

      {reading?.kind === "letter" && allRead && (
        <ChapterReader
          eyebrow="Lá thư cuối"
          title={garden.letter.title}
          paragraphs={garden.letter.paragraphs}
          signature={garden.letter.signature}
          onClose={() => setReading(null)}
        />
      )}
    </main>
  );
}
