"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import { FAIRYTALE_TEST_GARDEN_ID } from "@/features/garden/data/gardenThemes";
import { mapPersonalGarden } from "@/features/garden/data/mapPersonalGarden";
import GardenJournal, { normalizeStoryDecorations, type GardenJournalPhoto, type JournalChapter } from "@/features/garden/components/GardenJournal";

import type { PersonalGarden, PersonalGardenRow } from "@/types/personalGarden";
import styles from "../styles/GiftExperience.module.css";
import { useLanguage } from "@/features/i18n/LanguageProvider";

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
  const { t } = useLanguage();
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
    return <main className={styles.statePage}><section className={styles.stateCard}><p role="status">{t("Đang kiểm tra tài khoản...", "Checking account...")}</p><Link href="/">{t("Về trang chủ ↗", "Back to home ↗")}</Link></section></main>;
  }

  if (!user) {
    return (
      <main className={styles.statePage}>
        <section className={styles.stateCard}>
          <p className={styles.stateKicker}>{"LITTLE STORY WORLD"}</p>
          <h1>{t("Tác phẩm của bạn đang chờ.", "Your story is waiting.")}</h1>
          <p>{t("Bạn cần đăng nhập để mở tác phẩm riêng của tài khoản.", "Sign in to open the stories saved to your account.")}</p>
          <Link href="/login">{t("Đến trang đăng nhập ↗", "Sign in ↗")}</Link>
          <Link href="/">{t("Về trang chủ ↗", "Back to home ↗")}</Link>
        </section>
      </main>
    );
  }

  return <PersonalGardenJournal key={user.id} user={user}/>;
}

function PersonalGardenJournal({ user }: { user: User }) {
  const { t } = useLanguage();
  const [garden, setGarden] = useState<PersonalGarden | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [photos, setPhotos] = useState<GardenJournalPhoto[]>([]);
  const [gardenLoading, setGardenLoading] = useState(true);
  const [gardenError, setGardenError] = useState("");
  const [readIds, setReadIds] = useState<string[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState("");

  const chapters: JournalChapter[] = (garden?.chapters ?? []).map((chapter) => ({ id: chapter.id, title: chapter.title, paragraphs: chapter.paragraphs }));
  const allRead = chapters.length > 0 && chapters.every((chapter) => readIds.includes(chapter.id));

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
            experience_settings,
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
          setGardenError(t("Chưa tải được tác phẩm của bạn. Hãy thử tải lại trang nhé.", "Could not load your story. Please reload the page."));
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
          setProgressError(t("Chưa tải được tiến độ đọc. Hãy thử tải lại trang nhé.", "Could not load reading progress. Please reload."));
        } else {
          const chapterIds = new Set(personalGarden.chapters.map((chapter) => chapter.id));
          const validIds = (progress ?? []).map((row) => row.chapter_id as string).filter((id) => chapterIds.has(id));
          setReadIds([...new Set(validIds)]);
        }
        setProgressLoading(false);
      } catch (error) {
        if (!active) return;
        console.error("Load personal garden failed:", error);
        setGardenError(t("Có lỗi khi tải khu vườn. Hãy thử tải lại trang nhé.", "Something went wrong while loading your story. Please reload."));
        setGardenLoading(false);
        setProgressLoading(false);
      }
    }

    void loadPersonalGarden();
    return () => { active = false; };
  }, [user.id, t]);

  async function recordChapterRead(chapterId: string) {
    if (!chapters.some((chapter) => chapter.id === chapterId)) return;
    setProgressError("");
    const { error } = await supabase.from("story_progress").upsert(
      { user_id: user.id, chapter_id: chapterId },
      { onConflict: "user_id,chapter_id" },
    );
    if (error) {
      console.error("Save story progress error:", error);
      setProgressError(t("Chưa lưu được tiến độ đọc. Kiểm tra kết nối rồi thử lại nhé.", "Could not save reading progress. Check your connection and try again."));
      return;
    }
    setReadIds((current) => current.includes(chapterId) ? current : [...current, chapterId]);
  }

  if (gardenLoading) {
    return <main className={styles.statePage}><section className={styles.stateCard}><p role="status">{t("Đang mở cuốn sách của bạn...", "Opening your story...")}</p></section></main>;
  }

  if (gardenError || !garden) {
    return (
      <main className={styles.statePage}>
        <section className={styles.stateCard}>
          <p className={styles.stateKicker}>{"LITTLE STORY WORLD"}</p>
          <h1>{gardenError ? t("Tác phẩm đang gặp chút trục trặc.", "Your story is having a little trouble.") : t("Chưa có tác phẩm nào.", "There are no stories yet.")}</h1>
          <p>{gardenError || t("Tài khoản này chưa có tác phẩm. Hãy liên hệ người quản trị để được hỗ trợ.", "This account has no stories yet. Contact the administrator for help.")}</p>
          <Link href="/">{t("Về trang chủ ↗", "Back to home ↗")}</Link>
        </section>
      </main>
    );
  }

  return (
    <GardenJournal
      name={garden.name}
      introduction={garden.introduction}
      format="book"
      decorations={normalizeStoryDecorations(garden.experienceSettings?.storyDecorations)}
      coverUrl={coverUrl}
      photos={photos}
      chapters={chapters}
      readIds={readIds}
      onOpenChapter={recordChapterRead}
      letterTitle={garden.letter.title}
      letterParagraphs={garden.letter.paragraphs}
      letterSignature={garden.letter.signature}
      letterReady={allRead}
      returnHref="/"
      returnLabel="Little Story World"
      actionHref="#the-book"
      actionLabel={t("MỞ CUỐN SÁCH", "OPEN STORY")}
    >
      {progressError && <p role="alert" className={styles.stateKicker}>{progressError}</p>}
      {progressLoading && <p role="status" className={styles.stateKicker}>{t("Đang tải tiến độ đọc...", "Loading reading progress...")}</p>}
    </GardenJournal>
  );
}
