"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { FAIRYTALE_GARDEN_ADMIN_USER_ID } from "@/features/garden/data/gardenThemes";
import { useLanguage } from "@/features/i18n/LanguageProvider";
import styles from "../styles/LoginForm.module.css";

type RecoveryState = "checking" | "ready" | "invalid" | "admin" | "complete";

export default function ResetPasswordForm() {
  const router = useRouter();
  const { t } = useLanguage();
  const [state, setState] = useState<RecoveryState>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (session?.user.id === FAIRYTALE_GARDEN_ADMIN_USER_ID) setState("admin");
      else if (event === "PASSWORD_RECOVERY" && session) setState("ready");
      else if (session) setState("ready");
    });
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError || !data.session) setState("invalid");
      else if (data.session.user.id === FAIRYTALE_GARDEN_ADMIN_USER_ID) setState("admin");
      else setState("ready");
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || state !== "ready") return;
    setError("");
    if (password.length < 8 || password.length > 72) {
      setError(t("Mật khẩu cần có từ 8 đến 72 ký tự.", "Password must be 8 to 72 characters."));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("Hai mật khẩu chưa trùng khớp.", "The passwords do not match."));
      return;
    }
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      await supabase.auth.signOut({ scope: "local" });
      setState("complete");
      setPassword("");
      setConfirmPassword("");
    } catch {
      setError(t("Chưa thể cập nhật mật khẩu. Hãy mở liên kết khôi phục mới nhất và thử lại.", "We couldn't update your password. Please open your latest recovery link and try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <div>
        <h1 className={styles.title}>{t("Một khởi đầu mới", "A fresh beginning")}</h1>
        <p className={styles.subtitle}>{t("Tạo mật khẩu mới để tiếp tục viết nên những câu chuyện của bạn.", "Choose a new password to continue creating your stories.")}</p>
      </div>
      {state === "checking" && <p className={styles.notice} role="status">{t("Đang xác minh liên kết khôi phục...", "Verifying your recovery link...")}</p>}
      {state === "invalid" && <div className={styles.wrapper}>
        <p className={styles.error} role="alert">{t("Liên kết không hợp lệ hoặc đã hết hạn. Hãy yêu cầu một email khôi phục mới.", "This link is invalid or has expired. Please request a new recovery email.")}</p>
        <Link href="/forgot-password" className={styles.modeButton}>{t("Gửi liên kết mới", "Request a new link")}</Link>
      </div>}
      {state === "admin" && <p className={styles.error} role="alert">{t("Tài khoản Admin không sử dụng cổng khôi phục thành viên. Vui lòng dùng cổng quản trị riêng.", "The Admin account must use the separate Admin portal for account recovery.")}</p>}
      {state === "complete" && <div className={styles.wrapper}>
        <p className={styles.notice} role="status">{t("Mật khẩu đã được cập nhật. Bạn có thể đăng nhập bằng mật khẩu mới.", "Your password has been updated. You can now sign in with your new password.")}</p>
        <button type="button" className={styles.submit} onClick={() => router.replace("/login")}>{t("Đến trang đăng nhập", "Go to sign in")}</button>
      </div>}
      {state === "ready" && <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label htmlFor="new-password" className={styles.label}>{t("Mật khẩu mới", "New password")}</label>
          <div className={styles.passwordRow}>
            <input id="new-password" type={showPassword ? "text" : "password"} autoComplete="new-password" className={styles.input} value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={72} required />
            <button type="button" className={styles.toggle} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}>{showPassword ? t("Ẩn", "Hide") : t("Hiện", "Show")}</button>
          </div>
          <span className={styles.hint}>{t("Mật khẩu cần có từ 8 đến 72 ký tự.", "Use 8 to 72 characters.")}</span>
        </div>
        <div className={styles.field}>
          <label htmlFor="confirm-password" className={styles.label}>{t("Nhập lại mật khẩu", "Confirm password")}</label>
          <input id="confirm-password" type="password" autoComplete="new-password" className={styles.input} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} maxLength={72} required />
        </div>
        <button type="submit" className={styles.submit} disabled={loading}>{loading ? t("Đang cập nhật...", "Updating...") : t("Lưu mật khẩu mới", "Save new password")}</button>
      </form>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {state !== "complete" && <p className={styles.hint}><Link href="/login" className={styles.modeButton}>{t("Quay lại đăng nhập", "Back to sign in")}</Link></p>}
    </div>
  );
}
