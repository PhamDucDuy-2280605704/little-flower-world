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

    setLoading(true);
    try {
      const redirectTo = new URL("/account", window.location.origin).toString();
      const { data, error: signupError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { full_name: cleanName, display_name: cleanName },
          emailRedirectTo: redirectTo,
        },
      });

      if (signupError) throw signupError;

      if (data.user?.id === FAIRYTALE_GARDEN_ADMIN_USER_ID) {
        await supabase.auth.signOut({ scope: "local" });
        setError(t("Tài khoản quản trị không thể đăng ký qua cổng thành viên.", "The Admin account cannot register through the member portal."));
        return;
      }

      if (data.session && data.user) {
        router.replace("/account");
        router.refresh();
        return;
      }

      setNotice(t(
        "Tài khoản đã được tạo. Hãy kiểm tra email để xác nhận, sau đó đăng nhập để mở bàn sáng tác. Nếu email xác nhận đang tắt, bạn có thể đăng nhập ngay.",
        "Your account has been created. Check your email to confirm it, then sign in to open your writing studio. If email confirmation is disabled, you can sign in right away."
      ));
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
