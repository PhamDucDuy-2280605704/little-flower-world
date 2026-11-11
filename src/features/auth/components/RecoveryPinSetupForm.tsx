"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/features/i18n/LanguageProvider";
import styles from "../styles/LoginForm.module.css";

export default function RecoveryPinSetupForm() {
  const { t } = useLanguage();
  const [ready, setReady] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function verifySetupAccess() {
      const { data, error: userError } = await supabase.auth.getUser();
      if (!active) return;

      if (userError || !data.user) {
        window.location.replace("/login?next=%2Faccount%2Frecovery-pin");
        return;
      }

      const { data: pinStatus, error: pinStatusError } = await supabase.functions.invoke("account-recovery", {
        body: { action: "status" },
      });
      if (!active) return;

      if (pinStatusError || typeof pinStatus?.hasPin !== "boolean") {
        setError(t("Chưa thể xác minh trạng thái PIN. Hãy tải lại trang hoặc đăng nhập lại.", "We couldn't verify your PIN status. Reload the page or sign in again."));
        return;
      }

      if (pinStatus.hasPin) {
        window.location.replace("/account");
        return;
      }

      setReady(true);
    }

    void verifySetupAccess().catch((cause: unknown) => {
      console.error("Recovery PIN setup access check failed:", cause);
      if (active) {
        setError(t("Chưa thể kiểm tra tài khoản lúc này. Hãy thử tải lại trang.", "We couldn't check this account right now. Please reload the page."));
      }
    });

    return () => { active = false; };
  }, [t]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError("");
    setNotice("");
    if (!/^\d{6}$/.test(pin) || pin !== confirmPin) {
      setError(t("Mã PIN cần có đúng 6 chữ số và hai lần nhập phải trùng nhau.", "The PIN must be exactly 6 digits and both entries must match."));
      return;
    }
    setLoading(true);
    try {
      const { data, error: setErrorResult } = await supabase.functions.invoke("account-recovery", {
        body: { action: "set-pin", pin },
      });
      if (setErrorResult || data?.ok !== true) {
        setError(t("Chưa thể lưu mã PIN. Hãy đăng nhập lại rồi thử lần nữa.", "We couldn't save your PIN. Please sign in again and retry."));
        return;
      }
      setNotice(t("Mã PIN bảo mật đã được lưu. Admin không thể xem mã này.", "Your recovery PIN has been saved. Admin cannot view it."));
      setPin("");
      setConfirmPin("");
      window.location.replace("/account");
    } catch {
      setError(t("Chưa thể lưu mã PIN lúc này. Hãy thử lại.", "We couldn't save your PIN right now. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <div>
        <h1 className={styles.title}>{t("Thiết lập mã PIN khôi phục", "Set up your recovery PIN")}</h1>
        <p className={styles.subtitle}>{t(
          "Tài khoản hiện tại chưa có mã PIN. Tạo mã 6 chữ số để tự đặt lại mật khẩu mà không cần email.",
          "This account doesn't have a recovery PIN yet. Create a 6-digit code so you can reset your password without email."
        )}</p>
      </div>
      {!ready && <p className={styles.notice} role="status">{t("Đang kiểm tra phiên đăng nhập...", "Checking your session...")}</p>}
      {ready && <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label htmlFor="recovery-pin" className={styles.label}>{t("Mã PIN mới", "New PIN")}</label>
          <input id="recovery-pin" type="password" inputMode="numeric" autoComplete="off" className={styles.input} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))} minLength={6} maxLength={6} required />
        </div>
        <div className={styles.field}>
          <label htmlFor="confirm-recovery-pin" className={styles.label}>{t("Nhập lại mã PIN", "Confirm PIN")}</label>
          <input id="confirm-recovery-pin" type="password" inputMode="numeric" autoComplete="off" className={styles.input} value={confirmPin} onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 6))} minLength={6} maxLength={6} required />
        </div>
        <button type="submit" className={styles.submit} disabled={loading}>{loading ? t("Đang lưu...", "Saving...") : t("Lưu mã PIN bảo mật", "Save recovery PIN")}</button>
      </form>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {notice && <p className={styles.notice} role="status">{notice}</p>}
      <p className={styles.hint}>{t("Không dùng ngày sinh, số điện thoại hoặc mã dễ đoán. PIN không phải mật khẩu đăng nhập.", "Avoid birthdays, phone numbers, or predictable patterns. Your PIN is not a sign-in password.")}</p>
      <p className={styles.hint}><Link href="/account" className={styles.modeButton}>{t("Quay lại bàn sáng tác", "Back to your writing studio")}</Link></p>
    </div>
  );
}
