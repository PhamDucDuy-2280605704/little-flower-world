"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { FAIRYTALE_GARDEN_ADMIN_USER_ID } from "@/features/garden/data/gardenThemes";
import { useLanguage } from "@/features/i18n/LanguageProvider";
import styles from "../styles/LoginForm.module.css";

export default function SignupForm() {
  const router = useRouter();
  const { t } = useLanguage();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [recoveryPin, setRecoveryPin] = useState("");
  const [recoveryPinConfirm, setRecoveryPinConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError("");
    setNotice("");

    const cleanName = displayName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length < 2 || cleanName.length > 80) {
      setError(t("Tên hiển thị cần có từ 2 đến 80 ký tự.", "Your display name must be 2 to 80 characters."));
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setError(t("Email chưa đúng định dạng.", "Please enter a valid email address."));
      return;
    }
    if (password.length < 8 || password.length > 72) {
      setError(t("Mật khẩu cần có từ 8 đến 72 ký tự.", "Password must be 8 to 72 characters."));
      return;
    }
    if (!/^\\d{6}$/.test(recoveryPin) || recoveryPin !== recoveryPinConfirm) {
      setError(t("Mã PIN khôi phục phải gồm đúng 6 chữ số và hai lần nhập phải trùng nhau.", "Your recovery PIN must be exactly 6 digits and both entries must match."));
      return;
    }

    setLoading(true);
    try {
      const { data: registration, error: registrationError } = await supabase.functions.invoke("account-recovery", {
        body: {
          action: "register",
          email: cleanEmail,
          password,
          displayName: cleanName,
          pin: recoveryPin,
        },
      });

      if (registrationError || registration?.ok !== true) {
        const status = (registrationError as { context?: { status?: number } } | null)?.context?.status;
        if (status === 429) {
          setError(t("Bạn đã tạo quá nhiều tài khoản trong thời gian ngắn. Hãy chờ rồi thử lại.", "Too many signup attempts. Please wait and try again."));
          return;
        }
        throw new Error("signup failed");
      }

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (signInError) throw signInError;

      if (signInData.user?.id === FAIRYTALE_GARDEN_ADMIN_USER_ID) {
        await supabase.auth.signOut({ scope: "local" });
        setError(t("Tài khoản quản trị không thể đăng ký qua cổng thành viên.", "The Admin account cannot register through the member portal."));
        return;
      }

      router.replace("/account");
      router.refresh();
    } catch (cause: unknown) {
      const message = cause instanceof Error ? cause.message.toLowerCase() : "";
      if (message.includes("already registered") || message.includes("already been registered") || message.includes("user already exists")) {
        setError(t("Email này đã có tài khoản. Hãy đăng nhập nhé.", "An account already exists for this email. Please sign in."));
      } else if (message.includes("rate limit") || message.includes("too many requests")) {
        setError(t("Bạn thao tác hơi nhanh. Hãy chờ một chút rồi thử lại.", "Too many attempts. Please wait a moment and try again."));
      } else if (message.includes("password")) {
        setError(t("Mật khẩu chưa đáp ứng yêu cầu bảo mật của hệ thống.", "The password does not meet the security requirements."));
      } else {
        setError(t("Chưa thể tạo tài khoản lúc này. Hãy kiểm tra thông tin và thử lại.", "We couldn't create the account right now. Please check your details and try again."));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <div>
        <h1 className={styles.title}>{t("Tạo không gian kể chuyện của riêng bạn", "Create your own story space")}</h1>
        <p className={styles.subtitle}>
          {t("Đăng ký miễn phí để viết thông điệp, thư hoặc cuốn sách của riêng mình.", "Create a free account to write your own message, letter, or book.")}
        </p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label htmlFor="signup-name" className={styles.label}>{t("Tên hiển thị", "Display name")}</label>
          <input
            id="signup-name"
            type="text"
            autoComplete="name"
            className={styles.input}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            minLength={2}
            maxLength={80}
            required
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="signup-email" className={styles.label}>Email</label>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            className={styles.input}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="signup-password" className={styles.label}>{t("Mật khẩu", "Password")}</label>
          <div className={styles.passwordRow}>
            <input
              id="signup-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              className={styles.input}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              maxLength={72}
              required
            />
            <button
              type="button"
              className={styles.toggle}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? t("Ẩn", "Hide") : t("Hiện", "Show")}
            </button>
          </div>
          <span className={styles.hint}>{t("Ít nhất 8 ký tự. Tài khoản mới luôn bắt đầu với quyền User.", "At least 8 characters. New accounts always start with User access.")}</span>
        </div>

        <div className={styles.field}>
          <label htmlFor="signup-recovery-pin" className={styles.label}>{t("Mã PIN khôi phục (6 chữ số)", "Recovery PIN (6 digits)")}</label>
          <input
            id="signup-recovery-pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            className={styles.input}
            value={recoveryPin}
            onChange={(event) => setRecoveryPin(event.target.value.replace(/\\D/g, "").slice(0, 6))}
            minLength={6}
            maxLength={6}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="signup-recovery-pin-confirm" className={styles.label}>{t("Nhập lại mã PIN", "Confirm recovery PIN")}</label>
          <input
            id="signup-recovery-pin-confirm"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            className={styles.input}
            value={recoveryPinConfirm}
            onChange={(event) => setRecoveryPinConfirm(event.target.value.replace(/\\D/g, "").slice(0, 6))}
            minLength={6}
            maxLength={6}
            required
          />
          <span className={styles.hint}>{t("PIN chỉ dùng để khôi phục mật khẩu, không phải mã đăng nhập. Hãy giữ bí mật và tránh số dễ đoán.", "This PIN is only for password recovery, not sign-in. Keep it private and avoid predictable numbers.")}</span>
        </div>

        <button type="submit" className={styles.submit} disabled={loading}>
          {loading ? t("Đang tạo tài khoản...", "Creating account...") : t("Tạo tài khoản miễn phí", "Create free account")}
        </button>
      </form>

      {error && <p className={styles.error} role="alert">{error}</p>}
      {notice && <p className={styles.notice} role="status">{notice}</p>}

      <p className={styles.hint}>
        {t("Tài khoản thành viên có thể tự tạo và quản lý tác phẩm của mình. Quyền duyệt, quản lý người dùng và cài đặt Admin vẫn được bảo vệ riêng.", "Members can create and manage their own stories. Review, user management, and Admin settings remain restricted to Admin.")}
      </p>
      <p className={styles.hint}>
        {t("Đã có tài khoản?", "Already have an account?")}{" "}
        <Link href="/login" className={styles.modeButton}>{t("Đăng nhập", "Sign in")}</Link>
      </p>
    </div>
  );
}
