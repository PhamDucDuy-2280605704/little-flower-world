"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import GardenJournal, { type JournalChapter, type StoryFormat } from "./GardenJournal";
import styles from "../styles/SharedGardenExperience.module.css";

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

async function callShareFunction(payload: Record<string, unknown>): Promise<{ response: Response; data: Record<string, unknown> }> {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!baseUrl || !publishableKey) throw new Error("Thiếu cấu hình kết nối tác phẩm.");
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
  const [readIds, setReadIds] = useState<string[]>([]);
  const [guestName, setGuestName] = useState("");
  const [guestMessage, setGuestMessage] = useState("");
  const [guestSending, setGuestSending] = useState(false);
  const [guestNotice, setGuestNotice] = useState("");

  const requestWork = useCallback(async (candidatePin = "") => {
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
        setFatalError("Không thể tải tác phẩm lúc này. Vui lòng thử lại sau.");
        return;
      }
      setPayload(data as unknown as SharedGardenPayload);
      setState("ready");
      setAccessPin(candidatePin);
      setPin("");
      setReadIds([]);
    } catch (error) {
      console.error("Load shared story failed:", error);
      setState("error");
      setFatalError(error instanceof Error ? error.message : "Không thể kết nối đến tác phẩm.");
    }
  }, [slug]);

  useEffect(() => {
    // Initial public request owns the page loading state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void requestWork();
  }, [requestWork]);

  const garden = payload?.garden;
  const chapters: JournalChapter[] = useMemo(() => (payload?.chapters ?? []).map((chapter) => ({
    id: chapter.chapter_id,
    title: chapter.title,
    paragraphs: chapter.paragraphs,
  })), [payload]);
  const formatSetting = garden?.experience_settings?.storyFormat;
  const format: StoryFormat = formatSetting === "message" || formatSetting === "letter" ? formatSetting : "book";
  const allRead = chapters.length > 0 && chapters.every((chapter) => readIds.includes(chapter.id));

  function markChapterRead(chapterId: string) {
    setReadIds((current) => current.includes(chapterId) ? current : [...current, chapterId]);
  }

  async function submitGuestbook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!garden?.guestbook_enabled || guestSending) return;
    setGuestSending(true);
    setGuestNotice("");
    try {
      const { response, data } = await callShareFunction({
        action: "guestbook", slug, pin: accessPin, guestName, message: guestMessage, website: "",
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
    return <main className={styles.loading}><span>▤</span><p>Đang mở cuốn sách...</p></main>;
  }
  if (state === "pin") {
    return (
      <main className={styles.gatePage}>
        <section className={styles.gateCard}>
          <span className={styles.mark}>✉</span>
          <p className={styles.kicker}>A PRIVATE STORY FOR YOU</p>
          <h1>Một tác phẩm có khóa riêng</h1>
          <p>Người gửi đã đặt mã PIN cho tác phẩm này. Hãy nhập mã được gửi cùng đường link.</p>
          <form onSubmit={(event) => { event.preventDefault(); void requestWork(pin.trim()); }}>
            <label htmlFor="story-pin">Mã PIN</label>
            <input id="story-pin" type="password" value={pin} onChange={(event) => setPin(event.target.value)} autoComplete="off" inputMode="numeric" maxLength={40} autoFocus/>
            {pinError && <p className={styles.pinError} role="alert">{pinError}</p>}
            <button type="submit" disabled={!pin.trim()}>Mở tác phẩm</button>
          </form>
          <Link href="/guest">Quay về cổng khách</Link>
        </section>
      </main>
    );
  }
  if (state === "missing") {
    return <main className={styles.gatePage}><section className={styles.gateCard}><span className={styles.mark}>▤</span><h1>Tác phẩm chưa được chia sẻ</h1><p>Đường link không còn hoạt động hoặc người viết đã chuyển tác phẩm về bản nháp.</p><Link href="/guest">Quay về cổng khách</Link></section></main>;
  }
  if (state === "error" || !garden || !payload) {
    return <main className={styles.gatePage}><section className={styles.gateCard}><span className={styles.mark}>✉</span><h1>Chưa thể mở tác phẩm</h1><p>{fatalError || "Có lỗi khi tải tác phẩm."}</p><button type="button" onClick={() => void requestWork()}>Thử lại</button><Link href="/guest">Quay về cổng khách</Link></section></main>;
  }

  return (
    <GardenJournal
      name={garden.name}
      introduction={garden.introduction}
      format={format}
      coverUrl={garden.cover_url}
      photos={payload.photos}
      chapters={chapters}
      readIds={readIds}
      onOpenChapter={markChapterRead}
      letterTitle={garden.letter_title}
      letterParagraphs={garden.letter_paragraphs}
      letterSignature={garden.letter_signature}
      letterReady={allRead}
      returnHref="/guest"
      returnLabel="Quay về cổng khách"
      actionHref={garden.guestbook_enabled ? "#guestbook" : "#the-book"}
      actionLabel={garden.guestbook_enabled ? "ĐỂ LẠI LỜI NHẮN" : "MỞ CUỐN SÁCH"}
    >
      {garden.guestbook_enabled && (
        <section className={styles.guestbook} id="guestbook">
          <div className={styles.sectionHeading}>
            <span>✎</span>
            <div>
              <p className={styles.eyebrow}>A NOTE FROM THE READER</p>
              <h2>Để lại một lời nhắn</h2>
              <p>Lời nhắn sẽ được người viết xem trước khi xuất hiện công khai.</p>
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
  );
}
