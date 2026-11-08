"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import GardenJournal from "./GardenJournal";
import ChapterReader from "@/features/stories/components/ChapterReader";
import styles from "../styles/SharedGardenExperience.module.css";
import type { FlowerKind } from "@/types/flower";
import type { GardenItem, TimeOfDay, WindLevel } from "@/types/garden";
import type { StoryChapter } from "@/types/story";

type SharedGardenPayload = {
  garden: {
    id: string;
    name: string;
    introduction: string;
    letter_title: string;
    letter_paragraphs: string[];
    letter_signature: string;
    experience_settings: Record<string, unknown>;
    guestbook_enabled: boolean;
    cover_url: string | null;
  };
  items: Array<{
    id: string;
    kind: string;
    color: string;
    x: number;
    depth: number;
    size: number;
    chapter_id: string | null;
    label: string | null;
    title: string | null;
    sort_order: number;
  }>;
  chapters: Array<{
    chapter_id: string;
    sort_order: number;
    title: string;
    paragraphs: string[];
  }>;
  photos: Array<{ path: string; url: string; alt: string }>;
  guestbook: Array<{ id: string; guest_name: string; message: string; created_at: string }>;
};

type RequestState = "loading" | "pin" | "ready" | "missing" | "error";
type ReaderState = { kind: "chapter"; index: number } | { kind: "letter" } | null;

const FLOWER_KINDS = new Set<FlowerKind>([
  "daisy", "tulip", "sunflower", "rose", "lavender", "cherry", "lotus", "dandelion",
]);

async function callShareFunction(payload: Record<string, unknown>): Promise<{ response: Response; data: Record<string, unknown> }> {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!baseUrl || !publishableKey) throw new Error("Thiếu cấu hình kết nối khu vườn.");
  const response = await fetch(baseUrl.replace(/\/$/, "") + "/functions/v1/garden-share", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: publishableKey,
      Authorization: "Bearer " + publishableKey,
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({})) as Record<string, unknown>;
  return { response, data };
}

export default function SharedGardenExperience({ slug }: { slug: string }) {
  const [state, setState] = useState<RequestState>("loading");
  const [payload, setPayload] = useState<SharedGardenPayload | null>(null);
  const [pin, setPin] = useState("");
  const [accessPin, setAccessPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [fatalError, setFatalError] = useState("");
  const [reading, setReading] = useState<ReaderState>(null);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [guestName, setGuestName] = useState("");
  const [guestMessage, setGuestMessage] = useState("");
  const [guestSending, setGuestSending] = useState(false);
  const [guestNotice, setGuestNotice] = useState("");

  const requestGarden = useCallback(async (candidatePin = "") => {
    setState("loading");
    setPinError("");
    setFatalError("");
    try {
      const { response, data } = await callShareFunction({ action: "view", slug, pin: candidatePin });
      if (response.status === 404 || data.error === "NOT_FOUND") {
        setState("missing");
        return;
      }
      if (data.error === "PIN_REQUIRED" || data.error === "PIN_INVALID") {
        setState("pin");
        setPinError(data.error === "PIN_INVALID" ? "Mã PIN chưa chính xác. Anh/chị thử lại nhé." : "");
        return;
      }
      if (response.status === 429 || data.error === "RATE_LIMITED") {
        setState("pin");
        setPinError("Đã thử mã quá nhiều lần. Vui lòng quay lại sau 15 phút.");
        return;
      }
      if (!response.ok || typeof data.garden !== "object" || !data.garden) {
        setState("error");
        setFatalError("Không thể tải khu vườn lúc này. Vui lòng thử lại sau.");
        return;
      }
      setPayload(data as unknown as SharedGardenPayload);
      setState("ready");
      setAccessPin(candidatePin);
      setPin("");
    } catch (error) {
      console.error("Load shared garden failed:", error);
      setState("error");
      setFatalError(error instanceof Error ? error.message : "Không thể kết nối đến khu vườn.");
    }
  }, [slug]);

  useEffect(() => {
    // Initial public fetch is an external request; requestGarden owns its loading state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void requestGarden();
  }, [requestGarden]);

  const garden = payload?.garden;
  const items: GardenItem[] = useMemo(() => (payload?.items ?? [])
    .filter((item) => FLOWER_KINDS.has(item.kind as FlowerKind))
    .map((item) => ({
      id: item.id,
      kind: item.kind as FlowerKind,
      color: item.color,
      x: item.x,
      depth: item.depth,
      size: item.size,
      chapterId: item.chapter_id ?? undefined,
      label: item.label ?? undefined,
      title: item.title ?? undefined,
    })), [payload]);

  const chapters: StoryChapter[] = useMemo(() => (payload?.chapters ?? []).map((chapter) => {
    const flower = items.find((item) => item.chapterId === chapter.chapter_id);
    return {
      id: chapter.chapter_id,
      title: chapter.title,
      paragraphs: chapter.paragraphs,
      flowerKind: flower?.kind ?? "daisy",
      flowerColor: flower?.color ?? "#e9dfc8",
    };
  }), [payload, items]);

  const allRead = chapters.length > 0 && chapters.every((chapter) => readIds.includes(chapter.id));
  const currentChapter = reading?.kind === "chapter" ? chapters[reading.index] : null;

  const initialSettings = useMemo(() => {
    const values = garden?.experience_settings ?? {};
    const validWeather = ["clear", "cloudy", "rain", "snow"];
    const validSeason = ["spring", "summer", "autumn", "winter"];
    const validTime = ["day", "night"];
    const validWind = ["calm", "breeze", "strong"];
    return {
      weather: validWeather.includes(String(values.weather)) ? values.weather as "clear" | "cloudy" | "rain" | "snow" : "clear",
      season: validSeason.includes(String(values.season)) ? values.season as "spring" | "summer" | "autumn" | "winter" : "spring",
      time: validTime.includes(String(values.time)) ? values.time as TimeOfDay : "day",
      wind: validWind.includes(String(values.wind)) ? values.wind as WindLevel : "breeze",
      cinematicLighting: values.cinematicLighting !== false,
      ecologyEnabled: values.ecologyEnabled !== false,
      musicVolume: typeof values.musicVolume === "number" ? Math.min(1, Math.max(0, values.musicVolume)) : 0.55,
    };
  }, [garden?.experience_settings]);

  function openChapter(chapterId: string) {
    const index = chapters.findIndex((chapter) => chapter.id === chapterId);
    if (index < 0) return;
    setReadIds((current) => current.includes(chapterId) ? current : [...current, chapterId]);
    setReading({ kind: "chapter", index });
  }

  function openChapterIndex(index: number) {
    const chapter = chapters[index];
    if (chapter) openChapter(chapter.id);
  }

  async function submitGuestbook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!garden?.guestbook_enabled || guestSending) return;
    setGuestSending(true);
    setGuestNotice("");
    try {
      const { response, data } = await callShareFunction({
        action: "guestbook",
        slug,
        pin: accessPin,
        guestName,
        message: guestMessage,
        website: "",
      });
      if (!response.ok || data.ok !== true) {
        setGuestNotice(data.error === "RATE_LIMITED"
          ? "Anh/chị đã gửi khá nhiều lời nhắn. Vui lòng quay lại sau."
          : "Chưa gửi được lời nhắn. Anh/chị thử lại nhé.");
      } else {
        setGuestName("");
        setGuestMessage("");
        setGuestNotice(typeof data.message === "string" ? data.message : "Lời nhắn đã được gửi.");
      }
    } catch (error) {
      console.error("Guestbook submit failed:", error);
      setGuestNotice("Mạng đang bận, chưa gửi được lời nhắn.");
    } finally {
      setGuestSending(false);
    }
  }

  if (state === "loading") {
    return <main className={styles.loading}><span>✿</span><p>Đang mở cánh cổng khu vườn...</p></main>;
  }

  if (state === "pin") {
    return (
      <main className={styles.gatePage}>
        <section className={styles.gateCard}>
          <span className={styles.mark}>✧</span>
          <p className={styles.kicker}>A PRIVATE GARDEN INVITATION</p>
          <h1>Khu vườn có một chiếc khóa nhỏ</h1>
          <p>Người gửi đã đặt mã PIN cho món quà này. Hãy nhập mã được chia sẻ cùng đường link.</p>
          <form onSubmit={(event) => { event.preventDefault(); void requestGarden(pin.trim()); }}>
            <label htmlFor="garden-pin">Mã PIN</label>
            <input id="garden-pin" type="password" value={pin} onChange={(event) => setPin(event.target.value)} autoComplete="off" inputMode="numeric" maxLength={40} autoFocus/>
            {pinError && <p className={styles.pinError} role="alert">{pinError}</p>}
            <button type="submit" disabled={!pin.trim()}>Mở khu vườn</button>
          </form>
          <Link href="/guest">Quay về cổng khách</Link>
        </section>
      </main>
    );
  }

  if (state === "missing") {
    return <main className={styles.gatePage}><section className={styles.gateCard}><span className={styles.mark}>✿</span><h1>Khu vườn chưa mở cửa</h1><p>Đường link này không còn hoạt động hoặc người tạo đã chuyển khu vườn về bản nháp.</p><Link href="/guest">Quay về cổng khách</Link></section></main>;
  }

  if (state === "error" || !garden || !payload) {
    return <main className={styles.gatePage}><section className={styles.gateCard}><span className={styles.mark}>✿</span><h1>Chưa thể bước vào vườn</h1><p>{fatalError || "Có lỗi khi tải khu vườn."}</p><button type="button" onClick={() => void requestGarden()}>Thử lại</button><Link href="/guest">Quay về cổng khách</Link></section></main>;
  }

  return (
    <>
      <GardenJournal
        name={garden.name}
        introduction={garden.introduction}
        coverUrl={garden.cover_url}
        photos={payload.photos}
        items={items}
        chapters={chapters}
        readIds={readIds}
        onOpenChapter={openChapter}
        onOpenLetter={() => setReading({ kind: "letter" })}
        letterReady={allRead}
        progressText={"Đã khám phá " + readIds.length + " / " + chapters.length + " câu chuyện"}
        returnHref="/guest"
        returnLabel="Quay về cổng khách"
        actionHref={garden.guestbook_enabled ? "#guestbook" : "#the-path"}
        actionLabel={garden.guestbook_enabled ? "LEAVE A NOTE" : "EXPLORE"}
      >
        {garden.guestbook_enabled && (
          <section className={styles.guestbook} id="guestbook">
            <div className={styles.sectionHeading}>
              <span>✎</span>
              <div>
                <p className={styles.eyebrow}>A NOTE FOR THE GARDEN</p>
                <h2>Để lại một lời nhắn</h2>
                <p>Lời nhắn sẽ được người tạo xem trước khi xuất hiện trong khu vườn.</p>
              </div>
            </div>
            <form onSubmit={submitGuestbook}>
              <label>Tên của bạn<input value={guestName} onChange={(event) => setGuestName(event.target.value)} maxLength={50} required placeholder="Tên hoặc biệt danh"/></label>
              <label>Lời nhắn<textarea value={guestMessage} onChange={(event) => setGuestMessage(event.target.value)} maxLength={1000} rows={4} required placeholder="Gửi lại một điều dễ thương..."/></label>
              <button type="submit" disabled={guestSending || !guestName.trim() || !guestMessage.trim()}>{guestSending ? "Đang gửi..." : "Gửi lời nhắn"}</button>
              {guestNotice && <p role="status">{guestNotice}</p>}
            </form>
            {payload.guestbook.length > 0 && (
              <div className={styles.approvedNotes}>
                {payload.guestbook.map((entry) => (
                  <blockquote key={entry.id}><p>“{entry.message}”</p><footer>— {entry.guest_name}</footer></blockquote>
                ))}
              </div>
            )}
          </section>
        )}
      </GardenJournal>

      {reading?.kind === "chapter" && currentChapter && (
        <ChapterReader
          eyebrow={"Câu chuyện " + (reading.index + 1) + " / " + chapters.length}
          title={currentChapter.title}
          paragraphs={currentChapter.paragraphs}
          flower={{ kind: currentChapter.flowerKind, color: currentChapter.flowerColor }}
          onClose={() => setReading(null)}
          navigation={{
            onPrev: reading.index > 0 ? () => openChapterIndex(reading.index - 1) : undefined,
            onNext: reading.index < chapters.length - 1 ? () => openChapterIndex(reading.index + 1) : undefined,
          }}
        />
      )}
      {reading?.kind === "letter" && (
        <ChapterReader
          eyebrow="THE LAST PAGE"
          title={garden.letter_title}
          paragraphs={garden.letter_paragraphs}
          signature={garden.letter_signature}
          onClose={() => setReading(null)}
        />
      )}
    </>
  );
}
