
"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import styles from "../styles/LoginForm.module.css";
import { useLanguage } from "@/features/i18n/LanguageProvider";
import { FAIRYTALE_GARDEN_ADMIN_USER_ID } from "@/features/garden/data/gardenThemes";

export default function LoginForm() {
  const { t } = useLanguage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const cleanEmail = email.trim();

    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setError(t("Email chưa đúng định dạng.", "Invalid email format."));
      return;
    }

    if (!password) {
      setError(t("Vui lòng nhập mật khẩu.", "Please enter your password."));
      return;
    }

    setLoading(true);

    try {
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (signInError) throw signInError;

      if (signInData.user?.id === FAIRYTALE_GARDEN_ADMIN_USER_ID) {
        await supabase.auth.signOut({ scope: "local" });
        setError(t("Tài khoản này không thuộc cổng đăng nhập sáng tác.", "This account cannot use the writer sign-in."));
        return;
      }

      const { data: recoveryStatus, error: recoveryStatusError } = await supabase.functions.invoke("account-recovery", {
        body: { action: "status" },
      });
      if (recoveryStatusError) {
        throw new Error(t("Chưa thể kiểm tra trạng thái PIN bảo mật. Hãy thử đăng nhập lại sau ít phút.", "We couldn't verify your recovery PIN status. Please try signing in again shortly."));
      }
      if (typeof recoveryStatus?.hasPin !== "boolean") {
        throw new Error(t("Chưa xác minh được trạng thái PIN bảo mật. Vui lòng thử lại.", "We couldn't verify your recovery PIN status. Please try again."));
      }
      if (recoveryStatus.hasPin !== true) {
        // Force a clean document navigation so the new auth session is available
        // before the protected PIN setup screen checks it again.
        window.location.replace("/account/recovery-pin");
        return;
      }

      const requestedPath = new URLSearchParams(window.location.search).get("next");
      let nextPath = "/account";

      if (requestedPath?.startsWith("/") && !requestedPath.startsWith("//")) {
        try {
          const destination = new URL(requestedPath, window.location.origin);
          let decodedPath = destination.pathname.toLowerCase();
          try {
            decodedPath = decodeURIComponent(decodedPath);
          } catch {
            // Keep the normalized URL path when a malformed escape is supplied.
          }

          const isAdminDestination =
            decodedPath.startsWith("/admin")
            || decodedPath.startsWith("/private-admin")
            || decodedPath.startsWith("/little-story-backstage");

          // Keep redirects on this origin and never route a writer into Admin.
          if (destination.origin === window.location.origin && !isAdminDestination) {
            nextPath = destination.pathname + destination.search + destination.hash;
          }
        } catch {
          // Fall back to the writer workspace for malformed return URLs.
        }
      }

      window.location.replace(nextPath);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : t("Đã xảy ra lỗi. Hãy thử lại.", "Something went wrong. Please try again.");

      if (
        errorMessage.toLowerCase().includes("invalid login credentials")
      ) {
        setError(t("Email hoặc mật khẩu không chính xác.", "Incorrect email or password."));
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <div>
        <h1 className={styles.title}>{t("Câu chuyện của bạn đang chờ được viết", "Your story is waiting to be written")}</h1>
        <p className={styles.subtitle}>
          {t("Đăng nhập để viết câu chuyện riêng hoặc mở tác phẩm được gửi tặng.", "Sign in to write your own story or open a story someone shared with you.")}
        </p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label htmlFor="login-email" className={styles.label}>
            Email
          </label>

          <input
            id="login-email"
            type="email"
            autoComplete="username"
            className={styles.input}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="login-password" className={styles.label}>
            {t("Mật khẩu", "Password")}
          </label>

          <div className={styles.passwordRow}>
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className={styles.input}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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
        </div>

        <button
          type="submit"
          className={styles.submit}
          disabled={loading}
        >
          {loading ? t("Đang đăng nhập...", "Signing in...") : t("Đăng nhập", "Sign in")}
        </button>
      </form>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <p className={styles.hint}>
        <Link href="/forgot-password" className={styles.modeButton}>{t("Quên mật khẩu?", "Forgot password?")}</Link>
      </p>

      <p className={styles.hint}>
        {t("Bạn chưa có tài khoản?", "New to Little Story World?")}{" "}
        <Link href="/signup" className={styles.modeButton}>{t("Tạo tài khoản miễn phí", "Create a free account")}</Link>
      </p>
    </div>
  );
}
