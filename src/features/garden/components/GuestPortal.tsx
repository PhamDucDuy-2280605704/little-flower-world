"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "../styles/GuestPortal.module.css";
import { useLanguage } from "@/features/i18n/LanguageProvider";

function extractGardenSlug(value: string): string | null {
  const input = value.trim();
  if (!input) return null;
  let pathname = input;
  try {
    pathname = new URL(input, window.location.origin).pathname;
  } catch {
    // Continue with a pasted slug or relative path.
  }
  const match = pathname.match(/(?:^|\/)g\/([a-z0-9-]+)\/?$/i);
  const candidate = match?.[1] ?? pathname.replace(/^\/+|\/+$/g, "").replace(/^g\//i, "");
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(candidate) ? candidate : null;
}

export default function GuestPortal() {
  const router = useRouter();
  const { t } = useLanguage();
  const [invite, setInvite] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const slug = extractGardenSlug(invite);
    if (!slug) {
      setError(t("Anh/chị dán link lời mời dạng /g/ten-tac-pham hoặc nhập mã lời mời nhé.", "Paste an invitation link such as /g/story-name or enter the invitation code."));
      return;
    }
    setError("");
    router.push("/g/" + encodeURIComponent(slug));
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}><span>▤</span><strong>{t("Little Story World", "Little Story World")}</strong></Link>
        <span className={styles.areaLabel}>{t("KHU VỰC KHÁCH", "READER AREA")}</span>
      </header>
      <section className={styles.card}>
        <div className={styles.illustration} role="img" aria-label={t("Ảnh một cuốn sách đang mở trên bàn gỗ dưới ánh sáng tự nhiên", "An open book on a wooden desk in natural light")}>
          <span className={styles.illustrationLabel}>{t("A STORY, WAITING TO BE READ", "A STORY, WAITING TO BE READ")}</span>
        </div>
        <div className={styles.content}>
          <p className={styles.eyebrow}>{t("A PRIVATE STORY INVITATION", "A PRIVATE STORY INVITATION")}</p>
          <h1>{t("Bạn nhận được một lời mời?", "Have you received an invitation?")}</h1>
          <p className={styles.description}>
            Mở đường link tác phẩm mà người gửi đã chia sẻ. Bạn có thể lật từng trang,
            xem album và để lại lời nhắn mà không cần tạo tài khoản.
          </p>
          <form onSubmit={handleSubmit}>
            <label htmlFor="story-invite">{t("Link tác phẩm hoặc mã lời mời", "Story link or invitation code")}</label>
            <input
              id="story-invite"
              value={invite}
              onChange={(event) => { setInvite(event.target.value); setError(""); }}
              placeholder={t("Dán link /g/ten-tac-pham hoặc mã lời mời", "Paste a /g/story-name link or invitation code")}
              autoComplete="url"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "invite-error" : "invite-help"}
            />
            {error
              ? <p className={styles.error} id="invite-error" role="alert">{error}</p>
              : <p className={styles.help} id="invite-help">{t("Nếu bạn đã có link mời, chỉ cần mở trực tiếp link đó cũng được.", "Already have an invitation link? You can open it directly.")}</p>}
            <button type="submit" disabled={!invite.trim()}>Mở tác phẩm <span aria-hidden="true">↗</span></button>
          </form>
          <div className={styles.footerLinks}>
            <Link href="/">{t("Về trang chủ", "Back to home")}</Link>
            <Link href="/login">{t("Đăng nhập thành viên", "Writer sign-in")}</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
