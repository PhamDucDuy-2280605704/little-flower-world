"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useLanguage } from "@/features/i18n/LanguageProvider";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminSupabase } from "@/lib/adminSupabase";
import { FAIRYTALE_GARDEN_ADMIN_USER_ID } from "@/features/garden/data/gardenThemes";
import styles from "../styles/AdminLoginForm.module.css";

export default function AdminLoginForm() {
  const router = useRouter();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    void adminSupabase.auth.getSession().then(async ({ data, error: sessionError }) => {
      if (!active) return;

      if (sessionError) {
        setError(t("Chưa kiểm tra được phiên Admin. Hãy thử tải lại trang nhé.", "Could not verify the Admin session. Please reload the page."));
        setChecking(false);
        return;
      }

      const currentUser = data.session?.user;
      if (currentUser?.id === FAIRYTALE_GARDEN_ADMIN_USER_ID) {
        router.replace("/admin");
        router.refresh();
        return;
      }

      // Clear only a non-admin session from the isolated admin client.
      if (currentUser) {
        await adminSupabase.auth.signOut({ scope: "local" });
      }

      if (active) setChecking(false);
    }).catch(() => {
      if (active) {
        setError(t("Không thể kết nối tới cổng quản trị.", "Could not connect to the Admin portal."));
        setChecking(false);
      }
    });

    return () => {
      active = false;
    };
  }, [router, t]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setError("");
    const cleanEmail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setError(t("Bạn kiểm tra lại địa chỉ email nhé.", "Please check your email address."));
      return;
    }
    if (!password) {
      setError(t("Bạn nhập mật khẩu quản trị nhé.", "Please enter the Admin password."));
      return;
    }

    setLoading(true);
    try {
      const { data, error: signInError } = await adminSupabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (signInError) {
        const message = signInError.message.toLowerCase();
        setError(message.includes("invalid login credentials")
          ? t("Email hoặc mật khẩu quản trị không chính xác.", "Incorrect Admin email or password.")
          : t("Đăng nhập chưa thành công. Hãy thử lại nhé.", "Sign-in failed. Please try again."));
        return;
      }

      if (data.user?.id !== FAIRYTALE_GARDEN_ADMIN_USER_ID) {
        await adminSupabase.auth.signOut({ scope: "local" });
        setError(t("Tài khoản này không được cấp quyền quản trị.", "This account does not have Admin access."));
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch (cause: unknown) {
      console.error("Admin sign-in failed:", cause);
      setError(t("Có lỗi kết nối. Hãy thử lại sau nhé.", "A connection error occurred. Please try again later."));
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return <div className={styles.checking} role="status">{t("Đang kiểm tra phiên quản trị...", "Checking Admin session...")}</div>;
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.heading}>
        <p className={styles.eyebrow}>WELCOME BACK, ADMIN</p>
        <h1>{t("Chào mừng trở lại", "Welcome back")}</h1>
        <p>{t("Đăng nhập để quản lý tác phẩm và lưu giữ những câu chuyện.", "Sign in to manage stories and preserve memories.")}</p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label htmlFor="admin-email">{t("Email quản trị", "Admin email")}</label>
          <input
            id="admin-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="admin@example.com"
            required
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="admin-password">{t("Mật khẩu", "Password")}</label>
          <div className={styles.passwordField}>
            <input
              id="admin-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder={t("Nhập mật khẩu quản trị", "Enter Admin password")}
              required
            />
            <button
              type="button"
              className={styles.showPassword}
              onClick={() => setShowPassword((value) => !value)}
              aria-pressed={showPassword}
            >
              {showPassword ? t("Ẩn", "Hide") : t("Hiện", "Show")}
            </button>
          </div>
        </div>

        {error && <p className={styles.error} role="alert">{error}</p>}

        <button className={styles.submit} type="submit" disabled={loading}>
          {loading ? t("Đang xác thực...", "Authenticating...") : t("Vào trung tâm quản trị", "Open Admin center")}
          <span aria-hidden="true">↗</span>
        </button>
      </form>

      <div className={styles.separation}>
        <span />
        <p>{t("Phiên quản trị được lưu riêng, không ghi đè phiên khách", "The Admin session is kept separate and does not replace the writer session.")}</p>
        <span />
      </div>

      <Link href="/login" className={styles.guestLink}>← {t("Đăng nhập thành viên", "Writer sign-in")}</Link>
    </div>
  );
}
