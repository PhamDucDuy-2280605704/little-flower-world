"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import GardenJournal, { normalizeStoryDecorations, type JournalChapter, type StoryFormat } from "./GardenJournal";
import FamilyLetterReader from "./FamilyLetterReader";
import styles from "../styles/SharedGardenExperience.module.css";
import { useLanguage } from "@/features/i18n/LanguageProvider";

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
  photos: Array<{ path: string; url: string; alt: string; width?: number; height?: number }>;
  guestbook: Array<{ id: string; guest_name: string; message: string; created_at: string }>;
};

type RequestState = "loading" | "pin" | "ready" | "missing" | "error";

async function callShareFunction(payload: Record<string, unknown>): Promise<{ response: Response; data: Record<string, unknown> }> {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!baseUrl || !publishableKey) throw new Error("STORY_CONNECTION_CONFIG_MISSING");
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
  const { t } = useLanguage();
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
        setPinError(data.error === "PIN_INVALID" ? t("Mã PIN chưa chính xác. Anh/chị thử lại nhé.", "The PIN is incorrect. Please try again.") : "");
        return;
      }
      if (response.status === 429 || data.error === "RATE_LIMITED") {
        setState("pin");
        setPinError(t("Đã thử mã quá nhiều lần. Vui lòng quay lại sau 15 phút.", "Too many attempts. Please try again in 15 minutes."));
        return;
      }
      if (!response.ok || typeof data.garden !== "object" || !data.garden) {
        setState("error");
        setFatalError(t("Không thể tải tác phẩm lúc này. Vui lòng thử lại sau.", "This story cannot be loaded right now. Please try again later."));
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
      setFatalError(error instanceof Error && error.message === "STORY_CONNECTION_CONFIG_MISSING"
        ? t("Thiếu cấu hình kết nối tác phẩm.", "Story connection settings are missing.")
        : t("Không thể kết nối đến tác phẩm.", "Could not connect to this story."));
    }
  }, [slug, t]);

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
          ? t("Anh/chị đã gửi khá nhiều lời nhắn. Vui lòng quay lại sau.", "You have sent many notes. Please try again later.")
          : t("Chưa gửi được lời nhắn. Anh/chị thử lại nhé.", "Your note could not be sent. Please try again."));
      } else {
        setGuestName("");
        setGuestMessage("");
        setGuestNotice(typeof data.message === "string" ? data.message : t("Lời nhắn đã được gửi.", "Your note has been sent."));
      }
    } catch (error) {
      console.error("Guestbook submit failed:", error);
      setGuestNotice(t("Mạng đang bận, chưa gửi được lời nhắn.", "The network is busy. Your note could not be sent."));
    } finally {
      setGuestSending(false);
    }
  }

  if (state === "loading") {
    return <main className={styles.loading}><span>▤</span><p>{t("Đang mở cuốn sách...", "Opening your story...")}</p></main>;
  }
  if (state === "pin") {
    return (
      <main className={styles.gatePage}>
        <section className={styles.gateCard}>
          <span className={styles.mark}>✉</span>
          <p className={styles.kicker}>{t("A PRIVATE STORY FOR YOU", "A PRIVATE STORY FOR YOU")}</p>
          <h1>{t("Một tác phẩm có khóa riêng", "This story is private")}</h1>
          <p>{t("Người gửi đã đặt mã PIN cho tác phẩm này. Hãy nhập mã được gửi cùng đường link.", "The sender protected this story with a PIN. Enter the code shared with your link.")}</p>
          <form onSubmit={(event) => { event.preventDefault(); void requestWork(pin.trim()); }}>
            <label htmlFor="story-pin">{t("Mã PIN", "PIN")}</label>
            <input id="story-pin" type="password" value={pin} onChange={(event) => setPin(event.target.value)} autoComplete="off" inputMode="numeric" maxLength={40} autoFocus/>
            {pinError && <p className={styles.pinError} role="alert">{pinError}</p>}
            <button type="submit" disabled={!pin.trim()}>{t("Mở tác phẩm", "Open story")}</button>
          </form>
        </section>
      </main>
    );
  }
  if (state === "missing") {
    return <main className={styles.gatePage}><section className={styles.gateCard}><span className={styles.mark}>▤</span><h1>{t("Tác phẩm chưa được chia sẻ", "This story has not been shared")}</h1><p>{t("Đường link không còn hoạt động hoặc người viết đã chuyển tác phẩm về bản nháp.", "This link is no longer active, or the writer moved the story back to draft.")}</p></section></main>;
  }
  if (state === "error" || !garden || !payload) {
    return <main className={styles.gatePage}><section className={styles.gateCard}><span className={styles.mark}>✉</span><h1>{t("Chưa thể mở tác phẩm", "Unable to open this story")}</h1><p>{fatalError || t("Có lỗi khi tải tác phẩm.", "Something went wrong while loading the story.")}</p><button type="button" onClick={() => void requestWork()}>{t("Thử lại", "Try again")}</button></section></main>;
  }

  if (garden.experience_settings?.readOnlyStandalone === true) {
    return (
      <>
        <FamilyLetterReader
          name={garden.name}
          introduction={garden.introduction}
          chapters={chapters}
          photos={payload.photos}
          letterTitle={garden.letter_title}
          letterParagraphs={garden.letter_paragraphs}
          letterSignature={garden.letter_signature}
        />
        {garden.guestbook_enabled && (
          <section className={styles.guestbook} id="guestbook">
            <div className={styles.sectionHeading}>
              <span>✎</span>
              <div>
                <p className={styles.eyebrow}>{t("A NOTE FROM THE READER", "A NOTE FROM THE READER")}</p>
                <h2>{t("Để lại một lời nhắn", "Leave a note")}</h2>
                <p>{t("Lời nhắn sẽ được người viết xem trước khi xuất hiện công khai.", "The writer reviews notes before they appear publicly.")}</p>
              </div>
            </div>
            <form onSubmit={submitGuestbook}>
              <label>{t("Tên của bạn", "Your name")}<input value={guestName} onChange={(event) => setGuestName(event.target.value)} maxLength={50} required placeholder={t("Tên hoặc biệt danh", "Name or nickname")}/></label>
              <label>{t("Lời nhắn", "Your note")}<textarea value={guestMessage} onChange={(event) => setGuestMessage(event.target.value)} maxLength={1000} rows={4} required placeholder={t("Gửi lại một điều dễ thương...", "Leave a kind note...")}/></label>
              <button type="submit" disabled={guestSending || !guestName.trim() || !guestMessage.trim()}>{guestSending ? t("Đang gửi...", "Sending...") : t("Gửi lời nhắn", "Send note")}</button>
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
      </>
    );
  }

  return (
    <GardenJournal
      name={garden.name}
      introduction={garden.introduction}
      format={format}
      decorations={normalizeStoryDecorations(garden.experience_settings?.storyDecorations)}
      coverUrl={garden.cover_url}
      photos={payload.photos}
      chapters={chapters}
      readIds={readIds}
      onOpenChapter={markChapterRead}
      letterTitle={garden.letter_title}
      letterParagraphs={garden.letter_paragraphs}
      letterSignature={garden.letter_signature}
      letterReady={allRead}
      returnHref="/"
      returnLabel="Little Story World"
      actionHref={garden.guestbook_enabled ? "#guestbook" : "#the-book"}
      actionLabel={garden.guestbook_enabled ? "ĐỂ LẠI LỜI NHẮN" : "MỞ CUỐN SÁCH"}
    >
      {garden.guestbook_enabled && (
        <section className={styles.guestbook} id="guestbook">
          <div className={styles.sectionHeading}>
            <span>✎</span>
            <div>
              <p className={styles.eyebrow}>{t("A NOTE FROM THE READER", "A NOTE FROM THE READER")}</p>
              <h2>{t("Để lại một lời nhắn", "Leave a note")}</h2>
              <p>{t("Lời nhắn sẽ được người viết xem trước khi xuất hiện công khai.", "The writer reviews notes before they appear publicly.")}</p>
            </div>
          </div>
          <form onSubmit={submitGuestbook}>
            <label>{t("Tên của bạn", "Your name")}<input value={guestName} onChange={(event) => setGuestName(event.target.value)} maxLength={50} required placeholder={t("Tên hoặc biệt danh", "Name or nickname")}/></label>
            <label>{t("Lời nhắn", "Your note")}<textarea value={guestMessage} onChange={(event) => setGuestMessage(event.target.value)} maxLength={1000} rows={4} required placeholder={t("Gửi lại một điều dễ thương...", "Leave a kind note...")}/></label>
            <button type="submit" disabled={guestSending || !guestName.trim() || !guestMessage.trim()}>{guestSending ? t("Đang gửi...", "Sending...") : t("Gửi lời nhắn", "Send note")}</button>
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
