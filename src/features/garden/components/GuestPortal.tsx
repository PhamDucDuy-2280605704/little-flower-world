"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./GuestPortal.module.css";

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
  const [invite, setInvite] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const slug = extractGardenSlug(invite);
    if (!slug) {
      setError("Anh/chị dán link lời mời dạng /g/ten-khu-vuon hoặc nhập mã khu vườn nhé.");
      return;
    }
    setError("");
    router.push("/g/" + encodeURIComponent(slug));
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}><span>✿</span><strong>Little Flower World</strong></Link>
        <span className={styles.areaLabel}>KHU VỰC KHÁCH</span>
      </header>
      <section className={styles.card}>
        <div className={styles.illustration} aria-hidden="true">
          <span className={styles.moon} />
          <span className={styles.sparkle}>✧</span>
          <span className={styles.stem} />
          <span className={styles.flower}>✿</span>
          <span className={styles.ground} />
        </div>
        <div className={styles.content}>
          <p className={styles.eyebrow}>A PRIVATE GARDEN INVITATION</p>
          <h1>Bạn nhận được một lời mời?</h1>
          <p className={styles.description}>
            Mở đường link khu vườn mà người gửi đã chia sẻ. Bạn có thể đọc câu chuyện,
            xem album và để lại lời nhắn mà không cần tạo tài khoản.
          </p>
          <form onSubmit={handleSubmit}>
            <label htmlFor="garden-invite">Link lời mời hoặc mã khu vườn</label>
            <input
              id="garden-invite"
              value={invite}
              onChange={(event) => { setInvite(event.target.value); setError(""); }}
              placeholder="Dán link /g/ten-khu-vuon hoặc mã lời mời"
              autoComplete="url"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "invite-error" : "invite-help"}
            />
            {error
              ? <p className={styles.error} id="invite-error" role="alert">{error}</p>
              : <p className={styles.help} id="invite-help">Nếu bạn đã có link mời, chỉ cần mở trực tiếp link đó cũng được.</p>}
            <button type="submit" disabled={!invite.trim()}>Mở khu vườn <span aria-hidden="true">↗</span></button>
          </form>
          <div className={styles.footerLinks}>
            <Link href="/">Về trang chủ</Link>
            <Link href="/login">Đăng nhập thành viên</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
