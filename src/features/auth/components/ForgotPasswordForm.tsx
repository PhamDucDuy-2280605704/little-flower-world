"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/features/i18n/LanguageProvider";
import styles from "../styles/LoginForm.module.css";

export default function ForgotPasswordForm() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    if (!/^\d{6}$/.test(pin)) {
      setError(t("Mã PIN phải gồm đúng 6 chữ số.", "Your PIN must contain exactly 6 digits."));
      return;
    }
    if (password.length < 8 || password.length > 72) {
      setError(t("Mật khẩu mới cần có từ 8 đến 72 ký tự.", "Your new password must be 8 to 72 characters."));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("Hai mật khẩu chưa trùng khớp.", "The passwords do not match."));
      return;
    }

    setLoading(true);
    try {
      const { data, error: recoveryError } = await supabase.functions.invoke("account-recovery", {
        body: { action: "reset-password", email: cleanEmail, pin, password },
      });
      if (recoveryError || data?.ok !== true) {
        setError(t(
          "Thông tin khôi phục chưa chính xác hoặc yêu cầu đang tạm khóa. Hãy kiểm tra email, PIN và thử lại sau.",
          "The recovery details are incorrect or temporarily locked. Check your email and PIN, then try again later."
        ));
        return;
      }
      setPassword("");
      setConfirmPassword("");
      setPin("");
      setNotice(t("Mật khẩu đã được cập nhật. Bạn có thể đăng nhập bằng mật khẩu mới.", "Your password has been updated. You can now sign in with your new password."));
    } catch {
      setError(t("Chưa thể cập nhật mật khẩu lúc này. Hãy thử lại sau ít phút.", "We couldn't update your password right now. Please try again in a few minutes."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <div>
        <h1 className={styles.title}>{t("Tìm lại lối vào câu chuyện", "Find your way back to your stories")}</h1>
        <p className={styles.subtitle}>{t(
          "Không cần liên kết email. Nhập email tài khoản, mã PIN 6 chữ số bạn đã tạo và mật khẩu mới.",
          "No email link is required. Enter your account email, the 6-digit PIN you created, and a new password."
        )}</p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label htmlFor="recovery-email" className={styles.label}>Email</label>
          <input id="recovery-email" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false} className={styles.input} value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} required />
        </div>
        <div className={styles.field}>
          <label htmlFor="recovery-pin" className={styles.label}>{t("Mã PIN khôi phục", "Recovery PIN")}</label>
          <input id="recovery-pin" type="password" inputMode="numeric" autoComplete="off" className={styles.input} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))} minLength={6} maxLength={6} required />
        </div>
        <div className={styles.field}>
          <label htmlFor="new-password" className={styles.label}>{t("Mật khẩu mới", "New password")}</label>
          <input id="new-password" type="password" autoComplete="new-password" className={styles.input} value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={72} required />
        </div>
        <div className={styles.field}>
          <label htmlFor="confirm-password" className={styles.label}>{t("Nhập lại mật khẩu mới", "Confirm new password")}</label>
          <input id="confirm-password" type="password" autoComplete="new-password" className={styles.input} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} maxLength={72} required />
        </div>
        <button type="submit" className={styles.submit} disabled={loading}>
          {loading ? t("Đang xác minh và cập nhật...", "Verifying and updating...") : t("Đặt mật khẩu mới", "Set new password")}
        </button>
      </form>

      {error && <p className={styles.error} role="alert">{error}</p>}
      {notice && <p className={styles.notice} role="status">{notice}</p>}
      <p className={styles.hint}>
        <Link href="/login" className={styles.modeButton}>{t("Quay lại đăng nhập", "Back to sign in")}</Link>
      </p>
    </div>
  );
}
