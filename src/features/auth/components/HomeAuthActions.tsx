"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/features/i18n/LanguageProvider";

type HomeAuthActionsProps = {
  actionsClassName: string;
  loginClassName: string;
  giftClassName: string;
  messageClassName: string;
};

export default function HomeAuthActions({
  actionsClassName,
  loginClassName,
  giftClassName,
  messageClassName,
}: HomeAuthActionsProps) {
  const { t } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;

      setUser(session?.user ?? null);
      setAuthReady(true);
      setError("");
    });

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;

        if (error) {
          console.error("Get home session error:", error);
        }

        setUser(data.session?.user ?? null);
        setAuthReady(true);
      })
      .catch((error: unknown) => {
        if (!active) return;

        console.error("Get home session failed:", error);
        setUser(null);
        setAuthReady(true);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setError("");

    try {
      // Do not revoke other sessions for the same account (e.g. the separate admin portal).
      const { error } = await supabase.auth.signOut({ scope: "local" });

      if (error) {
        throw error;
      }

      setUser(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : t("Đăng xuất chưa thành công. Hãy thử lại nhé.", "Could not sign out. Please try again.");

      setError(message);
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className={actionsClassName}>
      {!authReady ? (
        <span className={loginClassName} role="status">
          {t("Đang kiểm tra tài khoản...", "Checking account...")}
        </span>
      ) : user ? (
        <button
          type="button"
          className={loginClassName}
          onClick={() => void handleLogout()}
          disabled={loggingOut}
          aria-busy={loggingOut}
          style={{
            font: "inherit",
            cursor: loggingOut ? "wait" : "pointer",
            border: "none",
          }}
        >
          {loggingOut ? t("Đang đăng xuất...", "Signing out...") : t("Đăng xuất", "Sign out")}
        </button>
      ) : (
        <Link href="/login" className={loginClassName}>
          {t("Đăng nhập để sáng tác", "Sign in to write")}
        </Link>
      )}

      {user && <Link href="/account" className={giftClassName}>{t("Viết câu chuyện của tôi", "Write my story")}</Link>}
      <Link href="/gift" className={giftClassName}>
        {t("Mở tác phẩm của tôi", "Open my stories")}
      </Link>

      {error && (
        <p className={messageClassName} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
