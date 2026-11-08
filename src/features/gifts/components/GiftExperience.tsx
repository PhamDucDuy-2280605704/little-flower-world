"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import { FAIRYTALE_TEST_GARDEN_ID } from "@/features/garden/data/gardenThemes";
import { mapPersonalGarden } from "@/features/garden/data/mapPersonalGarden";
import GardenJournal, { type GardenJournalPhoto } from "@/features/garden/components/GardenJournal";
import ChapterReader from "@/features/stories/components/ChapterReader";
import type { PersonalGarden, PersonalGardenRow } from "@/types/personalGarden";
import styles from "../styles/GiftExperience.module.css";

type Reading = { kind: "chapter"; index: number } | { kind: "letter" } | null;

const PHOTO_BUCKET = "garden-photos";
const PHOTO_LIMIT = 40;
const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);

async function loadGardenMedia(
  gardenId: string,
  legacyFolderId?: string,
  coverPath?: string | null,
): Promise<{ coverUrl: string | null; photos: GardenJournalPhoto[] }> {
  let coverUrl: string | null = null;
  if (coverPath) {
    const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(coverPath, 60 * 60);
    if (!error) coverUrl = data?.signedUrl ?? null;
  }

  const folders = Array.from(new Set([gardenId, legacyFolderId].filter((value): value is string => Boolean(value))));
  const lists = await Promise.all(folders.map(async (folder) => {
    const { data, error } = await supabase.storage.from(PHOTO_BUCKET).list(folder, {
      limit: PHOTO_LIMIT,
      sortBy: { column: "created_at", order: "desc" },
    });
    if (error) {
      console.warn("Load garden journal photos failed:", error);
      return [];
    }
    return (data ?? [])
      .filter((file) => file.name && file.id && PHOTO_TYPES.has(file.metadata?.mimetype ?? ""))
      .map((file) => ({ path: folder + "/" + file.name, createdAt: file.created_at ?? "" }));
  }));

  const records = lists.flat().sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)).slice(0, PHOTO_LIMIT);
  const signed = await Promise.all(records.map(async (record) => {
    const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(record.path, 60 * 60);
    if (error || !data?.signedUrl) return null;
    return { path: record.path, url: data.signedUrl, alt: "Một khoảnh khắc trong khu vườn" };
  }));

  return {
    coverUrl,
    photos: signed.filter((photo): photo is GardenJournalPhoto => photo !== null),
  };
}

export default function GiftExperience() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setAuthReady(true);
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) console.error("Get session error:", error);
      setUser(data.session?.user ?? null);
      setAuthReady(true);
    }).catch((error: unknown) => {
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
    return <main className={styles.statePage}><section className={styles.stateCard}><p role="status">Đang kiểm tra tài khoản...</p></section></main>;
  }

  if (!user) {
    return (
      <main className={styles.statePage}>
        <section className={styles.stateCard}>
          <p className={styles.stateKicker}>LITTLE FLOWER WORLD</p>
          <h1>Khu vườn đang chờ bạn.</h1>
          <p>Bạn cần đăng nhập để mở khu vườn riêng của tài khoản.</p>
          <Link href="/login">Đến trang đăng nhập ↗</Link>
        </section>
      </main>
    );
  }

  return <PersonalGardenJournal key={user.id} user={user}/>;
}

function PersonalGardenJournal({ user }: { user: User }) {
  const [garden, setGarden] = useState<PersonalGarden | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [photos, setPhotos] = useState<GardenJournalPhoto[]>([]);
  const [gardenLoading, setGardenLoading] = useState(true);
  const [gardenError, setGardenError] = useState("");
  const [readIds, setReadIds] = useState<string[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState("");
  const [reading, setReading] = useState<Reading>(null);

  const chapters = garden?.chapters ?? [];
  const allRead = chapters.length > 0 && chapters.every((chapter) => readIds.includes(chapter.id));
  const currentChapter = reading?.kind === "chapter" ? chapters[reading.index] : null;

  useEffect(() => {
    let active = true;

    async function loadPersonalGarden() {
      try {
        const { data, error } = await supabase
          .from("gardens")
          .select(`
            id,
            name,
            introduction,
            letter_title,
            letter_paragraphs,
            letter_signature,
            cover_path,
            garden_items (
              id, kind, color, x, depth, size, chapter_id, label, title, sort_order
            ),
            garden_chapters (
              chapter_id, sort_order, title, paragraphs
            )
          `)
          .eq("owner_id", user.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!active) return;
        if (error) {
          console.error("Load personal garden error:", error);
          setGardenError("Chưa tải được khu vườn của bạn. Hãy thử tải lại trang nhé.");
          setGardenLoading(false);
          return;
        }
        if (!data) {
          setGarden(null);
          setGardenLoading(false);
          return;
        }

        const personalGarden = mapPersonalGarden(data as unknown as PersonalGardenRow);
        setGarden(personalGarden);
        const media = await loadGardenMedia(
          data.id,
          data.id === FAIRYTALE_TEST_GARDEN_ID ? user.id : undefined,
          data.cover_path,
        );
        if (!active) return;
        setCoverUrl(media.coverUrl);
        setPhotos(media.photos);
        setGardenLoading(false);
        setProgressLoading(true);

        const { data: progress, error: progressLoadError } = await supabase
          .from("story_progress")
          .select("chapter_id")
          .eq("user_id", user.id);

        if (!active) return;
        if (progressLoadError) {
          console.error("Load story progress error:", progressLoadError);
          setProgressError("Chưa tải được tiến độ đọc. Hãy thử tải lại trang nhé.");
        } else {
          const chapterIds = new Set(personalGarden.chapters.map((chapter) => chapter.id));
          const validIds = (progress ?? []).map((row) => row.chapter_id as string).filter((id) => chapterIds.has(id));
          setReadIds([...new Set(validIds)]);
        }
        setProgressLoading(false);
      } catch (error) {
        if (!active) return;
        console.error("Load personal garden failed:", error);
        setGardenError("Có lỗi khi tải khu vườn. Hãy thử tải lại trang nhé.");
        setGardenLoading(false);
        setProgressLoading(false);
      }
    }

    void loadPersonalGarden();
    return () => { active = false; };
  }, [user.id]);

  async function openChapter(index: number) {
    const chapter = chapters[index];
    if (!chapter) return;
    setReading({ kind: "chapter", index });
    setProgressError("");

    const { error } = await supabase.from("story_progress").upsert(
      { user_id: user.id, chapter_id: chapter.id },
      { onConflict: "user_id,chapter_id" },
    );
    if (error) {
      console.error("Save story progress error:", error);
      setProgressError("Chưa lưu được chương này. Kiểm tra kết nối rồi thử lại nhé.");
      return;
    }
    setReadIds((current) => current.includes(chapter.id) ? current : [...current, chapter.id]);
  }

  function openChapterById(chapterId: string) {
    const index = chapters.findIndex((chapter) => chapter.id === chapterId);
    if (index >= 0) void openChapter(index);
  }

  if (gardenLoading) {
    return <main className={styles.statePage}><section className={styles.stateCard}><p role="status">Đang mở nhật ký khu vườn...</p></section></main>;
  }

  if (gardenError || !garden) {
    return (
      <main className={styles.statePage}>
        <section className={styles.stateCard}>
          <p className={styles.stateKicker}>LITTLE FLOWER WORLD</p>
          <h1>{gardenError ? "Khu vườn đang gặp chút trục trặc." : "Khu vườn chưa được gieo."}</h1>
          <p>{gardenError || "Tài khoản này chưa có khu vườn. Hãy liên hệ người quản trị để được hỗ trợ."}</p>
          <Link href="/">Về trang chủ ↗</Link>
        </section>
      </main>
    );
  }

  return (
    <>
      <GardenJournal
        name={garden.name}
        introduction={garden.introduction}
        coverUrl={coverUrl}
        photos={photos}
        items={garden.items}
        chapters={chapters}
        readIds={readIds}
        onOpenChapter={openChapterById}
        onOpenLetter={() => setReading({ kind: "letter" })}
        letterReady={allRead}
        progressText={progressError || (progressLoading ? "Đang tải tiến độ..." : "Đã đọc " + readIds.length + " / " + chapters.length + " chương")}
        returnHref="/"
        returnLabel="Little Flower World"
        actionHref="#the-path"
        actionLabel="EXPLORE THE STORY"
      />

      {reading?.kind === "chapter" && currentChapter && (
        <ChapterReader
          eyebrow={"Chapter " + (reading.index + 1) + " of " + chapters.length}
          title={currentChapter.title}
          paragraphs={currentChapter.paragraphs}
          flower={{ kind: currentChapter.flowerKind, color: currentChapter.flowerColor }}
          navigation={{
            onPrev: reading.index > 0 ? () => void openChapter(reading.index - 1) : undefined,
            onNext: reading.index < chapters.length - 1 ? () => void openChapter(reading.index + 1) : undefined,
          }}
          onClose={() => setReading(null)}
        />
      )}

      {reading?.kind === "letter" && allRead && (
        <ChapterReader
          eyebrow="THE LAST PAGE"
          title={garden.letter.title}
          paragraphs={garden.letter.paragraphs}
          signature={garden.letter.signature}
          onClose={() => setReading(null)}
        />
      )}
    </>
  );
}
