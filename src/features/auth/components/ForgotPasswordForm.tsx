"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/features/i18n/LanguageProvider";
import styles from "../styles/LoginForm.module.css";

export default function ForgotPasswordForm() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError("");
    setNotice("");
    const cleanEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail) || cleanEmail.length > 254) {
      setError(t("Vui lòng nhập email hợp lệ.", "Please enter a valid email address."));
      return;
    }
    setLoading(true);
    try {
      const { error: requestError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: window.location.origin + "/reset-password",
      });
      if (requestError) throw requestError;
      setNotice(t(
        "Nếu email này đã đăng ký, hướng dẫn đặt lại mật khẩu sẽ được gửi đến hộp thư. Hãy kiểm tra cả mục Spam.",
        "If an account exists for this email, password reset instructions will arrive shortly. Please check your spam folder too."
      ));
    } catch (cause: unknown) {
      const message = cause instanceof Error ? cause.message.toLowerCase() : "";
      if (message.includes("rate limit") || message.includes("too many requests")) {
        setError(t("Bạn yêu cầu hơi nhanh. Hãy chờ một chút rồi thử lại.", "Too many requests. Please wait a moment and try again."));
      } else {
        setError(t("Chưa thể gửi email khôi phục lúc này. Hãy thử lại sau ít phút.", "We couldn't send the recovery email right now. Please try again in a few minutes."));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <div>
        <h1 className={styles.title}>{t("Tìm lại lối vào câu chuyện", "Find your way back to your stories")}</h1>
        <p className={styles.subtitle}>{t("Nhập email đã dùng để đăng ký. Chúng tôi sẽ gửi cho bạn liên kết tạo mật khẩu mới.", "Enter the email you used to register. We'll send you a secure link to choose a new password.")}</p>
      </div>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label htmlFor="recovery-email" className={styles.label}>Email</label>
          <input id="recovery-email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} className={styles.input} value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
        <button type="submit" className={styles.submit} disabled={loading}>
          {loading ? t("Đang gửi...", "Sending...") : t("Gửi liên kết khôi phục", "Send recovery link")}
        </button>
      </form>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {notice && <p className={styles.notice} role="status">{notice}</p>}
      <p className={styles.hint}><Link href="/login" className={styles.modeButton}>{t("Quay lại đăng nhập", "Back to sign in")}</Link></p>
    </div>
  );
}
